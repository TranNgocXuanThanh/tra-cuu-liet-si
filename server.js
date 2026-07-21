const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 1. CẤU HÌNH KẾT NỐI POSTGRESQL
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

function parseCSVRow(rowText) {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < rowText.length; i++) {
        const char = rowText[i];
        if (char === '"') inQuotes = !inQuotes;
        else if (char === ',' && !inQuotes) {
            result.push(current.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
            current = '';
        } else current += char;
    }
    result.push(current.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
    return result;
}

// 2. HÀM ĐỒNG BỘ DỮ LIỆU TỪ GOOGLE SHEETS
async function dongBoToanBoDuLieu() {
    const client = await pool.connect();
    try {
        console.log("⏳ Đang chuẩn bị cơ sở dữ liệu...");
        
        // Tự động bật tính năng unaccent trong PostgreSQL
        await client.query('CREATE EXTENSION IF NOT EXISTS unaccent;');
        
        console.log("⏳ Đang bắt đầu tải dữ liệu từ Google Sheets...");
        
        // --- ĐỒNG BỘ MỘ PHẦN ---
        await client.query('DROP TABLE IF EXISTS danh_sach_liet_si CASCADE;');
        await client.query(`
            CREATE TABLE danh_sach_liet_si (
                id_db SERIAL PRIMARY KEY,
                so_tt TEXT, ho_va_ten TEXT, nam_sinh TEXT, que_quan TEXT, 
                hang TEXT, so_mo TEXT, don_vi TEXT, ngay_hy_sinh TEXT, noi_hy_sinh TEXT, tieu_su TEXT
            );
        `);
        const resNgoai = await fetch('https://docs.google.com/spreadsheets/d/1TbM4AzOCczRc_5nSlQY3iT5aOYXSAb2W5PTqjNJYx_U/export?format=csv&gid=0');
        if (resNgoai.ok) {
            const csvNgoai = await resNgoai.text();
            const rowsNgoai = csvNgoai.split(/\r?\n/).slice(1);
            for (let row of rowsNgoai) {
                if (!row || row.trim() === '') continue;
                const cols = parseCSVRow(row);
                const values = Array.from({ length: 10 }, (_, i) => cols[i] || "");
                await client.query(`INSERT INTO danh_sach_liet_si (so_tt, ho_va_ten, nam_sinh, que_quan, hang, so_mo, don_vi, ngay_hy_sinh, noi_hy_sinh, tieu_su) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`, values);
            }
        }

        // --- ĐỒNG BỘ ĐỀN THỜ ---
        await client.query('DROP TABLE IF EXISTS danh_sach_trong_den CASCADE;');
        await client.query(`
            CREATE TABLE danh_sach_trong_den (
                id_db SERIAL PRIMARY KEY,
                so_tt TEXT, ho_va_ten TEXT, nam_sinh TEXT, que_quan TEXT, 
                nam_hy_sinh TEXT, don_vi TEXT, danh_hieu TEXT, 
                board TEXT, "row" TEXT, col TEXT, tieu_su TEXT
            );
        `);
        
        const shrineGids = ['0','164496961', '2030583334', '520701169', '1389251803', '2097412071', '256922227', '1621758412', '1896480892'];

        let boardIndex = 1; 

        for (const gid of shrineGids) {
            const resTrong = await fetch(`https://docs.google.com/spreadsheets/d/18KqyTFMNp_1hm4hQObfc7b8HtmsLLD6jkievCvYkF4U/export?format=csv&gid=${gid}`);
            if (resTrong.ok) {
                const csvTrong = await resTrong.text();
                const rowsTrong = csvTrong.split(/\r?\n/).slice(1); 
                for (let row of rowsTrong) {
                    if (!row || row.trim() === '') continue;
                    const cols = parseCSVRow(row);
                    
                    const values = [
                        cols[0] || "",  // $1: so_tt
                        cols[1] || "",  // $2: ho_va_ten
                        cols[2] || "",  // $3: nam_sinh
                        cols[3] || "",  // $4: que_quan
                        cols[4] || "",  // $5: nam_hy_sinh
                        cols[5] || "",  // $6: don_vi
                        cols[9] || "",  // $7: danh_hieu
                        cols[10] || "", // $8: board
                        cols[6] || "",  // $9: "row"
                        cols[7] || "",  // $10: col
                        cols[8] || ""   // $11: tieu_su
                    ];

                    await client.query(`
                        INSERT INTO danh_sach_trong_den 
                        (so_tt, ho_va_ten, nam_sinh, que_quan, nam_hy_sinh, don_vi, danh_hieu, board, "row", col, tieu_su) 
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                    `, values);
                }
            }
            boardIndex++; 
        }
        console.log("✅ Đã hoàn tất đồng bộ toàn bộ dữ liệu vào cơ sở dữ liệu!");
    } catch (err) {
        console.error("❌ Lỗi đồng bộ:", err.message);
    } finally {
        client.release();
    }
}

// 3. API TRA CỨU: MỘ PHẦN (Tìm kiếm gần đúng, không dấu, có dấu, hoa, thường)
app.get('/api/martyrs', async (req, res) => {
    try {
        const { name, birth, home, area, row, grave } = req.query;
        let sql = `SELECT id_db AS id, so_tt, ho_va_ten, nam_sinh, que_quan, hang, so_mo FROM danh_sach_liet_si WHERE 1=1`;
        const values = []; let paramIndex = 1;
        
        if (name) { 
            sql += ` AND (ho_va_ten ILIKE $${paramIndex} OR unaccent(ho_va_ten) ILIKE unaccent($${paramIndex}))`; 
            values.push(`%${name}%`); 
            paramIndex++; 
        }
        if (birth) { 
            sql += ` AND nam_sinh ILIKE $${paramIndex}`; 
            values.push(`%${birth}%`); 
            paramIndex++; 
        }
        if (home) { 
            sql += ` AND (que_quan ILIKE $${paramIndex} OR unaccent(que_quan) ILIKE unaccent($${paramIndex}))`; 
            values.push(`%${home}%`); 
            paramIndex++; 
        }
        if (area) { 
            sql += ` AND hang ILIKE $${paramIndex}`; 
            values.push(`%${area}%`); 
            paramIndex++; 
        }
        if (row) { 
            sql += ` AND hang ILIKE $${paramIndex}`; 
            values.push(`%${row}%`); 
            paramIndex++; 
        }
        if (grave) { 
            sql += ` AND so_mo ILIKE $${paramIndex}`; 
            values.push(`%${grave}%`); 
            paramIndex++; 
        }
        
        sql += " ORDER BY CAST(NULLIF(TRIM(so_tt), '') AS INT) ASC NULLS LAST";
        const result = await pool.query(sql, values);
        res.json(result.rows);
    } catch (err) { 
        console.error(err);
        res.status(500).json({ error: "Lỗi Server API Mộ phần" }); 
    }
});

// 4. API TRA CỨU: TRONG ĐỀN THỜ (Tìm kiếm gần đúng, không dấu, có dấu, hoa, thường)
app.get('/api/shrine-martyrs', async (req, res) => {
    try {
        const { name, birth, home, deathYear } = req.query;
        let sql = `
            SELECT id_db AS id, ho_va_ten AS name, nam_sinh AS birth, que_quan AS home, 
                   nam_hy_sinh AS "deathYear", board, "row", col 
            FROM danh_sach_trong_den WHERE 1=1
        `;
        const values = []; let paramIndex = 1;
        
        if (name) { 
            sql += ` AND (ho_va_ten ILIKE $${paramIndex} OR unaccent(ho_va_ten) ILIKE unaccent($${paramIndex}))`; 
            values.push(`%${name}%`); 
            paramIndex++; 
        }
        if (birth) { 
            sql += ` AND nam_sinh ILIKE $${paramIndex}`; 
            values.push(`%${birth}%`); 
            paramIndex++; 
        }
        if (home) { 
            sql += ` AND (que_quan ILIKE $${paramIndex} OR unaccent(que_quan) ILIKE unaccent($${paramIndex}))`; 
            values.push(`%${home}%`); 
            paramIndex++; 
        }
        if (deathYear) { 
            sql += ` AND nam_hy_sinh ILIKE $${paramIndex}`; 
            values.push(`%${deathYear}%`); 
            paramIndex++; 
        }
        
        sql += " ORDER BY CAST(NULLIF(TRIM(so_tt), '') AS INT) ASC NULLS LAST";
        const result = await pool.query(sql, values);
        res.json(result.rows);
    } catch (err) { 
        console.error(err);
        res.status(500).json({ error: "Lỗi Server API Đền Thờ" }); 
    }
});

// 5. API CHI TIẾT: MỘ PHẦN
app.get('/api/martyrs/:id', async (req, res) => {
    try {
        const result = await pool.query(`SELECT * FROM danh_sach_liet_si WHERE id_db = $1`, [req.params.id]);
        if (result.rows.length === 0) return res.status(404).json({ message: "Không tìm thấy" });
        res.json(result.rows[0]);
    } catch (err) { res.status(500).json({ error: "Lỗi chi tiết mộ phần" }); }
});

// 6. API CHI TIẾT: ĐỀN THỜ
app.get('/api/shrine-martyrs/:id', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT id_db AS id, ho_va_ten AS name, nam_sinh AS birth, que_quan AS home, 
                   nam_hy_sinh AS "deathYear", don_vi AS unit, danh_hieu AS "title", 
                   board, "row", col, tieu_su AS bio 
            FROM danh_sach_trong_den WHERE id_db = $1
        `, [req.params.id]);
        if (result.rows.length === 0) return res.status(404).json({ message: "Không tìm thấy" });
        res.json(result.rows[0]);
    } catch (err) { res.status(500).json({ error: "Lỗi chi tiết đền thờ" }); }
});

// API LÀM MỚI DỮ LIỆU THỦ CÔNG
app.get('/api/sync-data', async (req, res) => {
    await dongBoToanBoDuLieu();
    res.json({ message: "Đã cập nhật dữ liệu mới nhất từ Google Sheets!" });
});

// API WEBHOOK
app.post('/api/sync-webhook', async (req, res) => {
    try {
        console.log("🔄 Bắt đầu nhận tín hiệu đồng bộ qua Webhook...");
        await dongBoToanBoDuLieu();
        console.log("✅ Webhook đã chạy xong lệnh đồng bộ!");
        res.status(200).json({ message: "Đồng bộ thành công!" });
    } catch (err) {
        console.error("❌ Lỗi khi Webhook kích hoạt đồng bộ:", err);
        res.status(500).json({ error: "Lỗi hệ thống khi đồng bộ" });
    }
});

// 7. KHỞI ĐỘNG SERVER
app.listen(port, async () => { 
    console.log(`🚀 Server đang chạy mượt mà tại cổng ${port}`); 
    await dongBoToanBoDuLieu(); 
});
