const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

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

async function dongBoToanBoDuLieu() {
    const client = await pool.connect();
    try {
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

        for (const gid of shrineGids) {
            const resTrong = await fetch(`https://docs.google.com/spreadsheets/d/18KqyTFMNp_1hm4hQObfc7b8HtmsLLD6jkievCvYkF4U/export?format=csv&gid=${gid}`);
            if (resTrong.ok) {
                const csvTrong = await resTrong.text();
                const rowsTrong = csvTrong.split(/\r?\n/).slice(1); 
                for (let row of rowsTrong) {
                    if (!row || row.trim() === '') continue;
                    const cols = parseCSVRow(row);
                    const values = [
                        cols[0] || "", cols[1] || "", cols[2] || "", cols[3] || "",  
                        cols[4] || "", cols[5] || "", cols[9] || "", cols[10] || "", 
                        cols[6] || "", cols[7] || "", cols[8] || ""    
                    ];
                    await client.query(`
                        INSERT INTO danh_sach_trong_den 
                        (so_tt, ho_va_ten, nam_sinh, que_quan, nam_hy_sinh, don_vi, danh_hieu, board, "row", col, tieu_su) 
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                    `, values);
                }
            }
        }
        console.log("✅ Đồng bộ dữ liệu thành công!");
    } catch (err) {
        console.error("❌ Lỗi đồng bộ:", err.message);
    } finally {
        client.release();
    }
}

// API DANH SÁCH NGOÀI NGHĨA TRANG (HỖ TRỢ TÌM KIẾM KHÔNG DẤU)
app.get('/api/martyrs', async (req, res) => {
    try {
        let { name, home } = req.query;
        let conditions = [];
        let values = [];
        let paramIndex = 1;

        let baseQuery = `
            SELECT id_db AS id, so_tt, ho_va_ten, nam_sinh, que_quan, hang, so_mo 
            FROM danh_sach_liet_si
        `;

        if (name && name.trim() !== '') {
            conditions.push(`translate(LOWER(ho_va_ten), 'áàảãạăắằẳẵặâấầẩẫậéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵđ', 'aaaaaaaaaaaaaaaaaeeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyyyd') LIKE translate(LOWER($${paramIndex}), 'áàảãạăắằẳẵặâấầẩẫậéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵđ', 'aaaaaaaaaaaaaaaaaeeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyyyd')`);
            values.push(`%${name.trim()}%`);
            paramIndex++;
        }
        if (home && home.trim() !== '') {
            conditions.push(`translate(LOWER(que_quan), 'áàảãạăắằẳẵặâấầẩẫậéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵđ', 'aaaaaaaaaaaaaaaaaeeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyyyd') LIKE translate(LOWER($${paramIndex}), 'áàảãạăắằẳẵặâấầẩẫậéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵđ', 'aaaaaaaaaaaaaaaaaeeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyyyd')`);
            values.push(`%${home.trim()}%`);
            paramIndex++;
        }

        if (conditions.length > 0) {
            baseQuery += ` WHERE ` + conditions.join(' AND ');
        }

        baseQuery += ` ORDER BY CAST(NULLIF(TRIM(so_tt), '') AS INT) ASC NULLS LAST`;

        const result = await pool.query(baseQuery, values);
        res.json(result.rows);
    } catch (err) { 
        console.error(err);
        res.status(500).json({ error: "Lỗi Server" }); 
    }
});

// API DANH SÁCH TRONG ĐỀN (HỖ TRỢ TÌM KIẾM KHÔNG DẤU)
app.get('/api/shrine-martyrs', async (req, res) => {
    try {
        let { name, birth, home, deathYear } = req.query;
        let conditions = [];
        let values = [];
        let paramIndex = 1;

        let baseQuery = `
            SELECT id_db AS id, ho_va_ten AS name, nam_sinh AS birth, que_quan AS home, 
                   nam_hy_sinh AS "deathYear", board, "row", col 
            FROM danh_sach_trong_den
        `;

        if (name && name.trim() !== '') {
            conditions.push(`translate(LOWER(ho_va_ten), 'áàảãạăắằẳẵặâấầẩẫậéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵđ', 'aaaaaaaaaaaaaaaaaeeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyyyd') LIKE translate(LOWER($${paramIndex}), 'áàảãạăắằẳẵặâấầẩẫậéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵđ', 'aaaaaaaaaaaaaaaaaeeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyyyd')`);
            values.push(`%${name.trim()}%`);
            paramIndex++;
        }
        if (birth && birth.trim() !== '') {
            conditions.push(`nam_sinh LIKE $${paramIndex}`);
            values.push(`%${birth.trim()}%`);
            paramIndex++;
        }
        if (home && home.trim() !== '') {
            conditions.push(`translate(LOWER(que_quan), 'áàảãạăắằẳẵặâấầẩẫậéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵđ', 'aaaaaaaaaaaaaaaaaeeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyyyd') LIKE translate(LOWER($${paramIndex}), 'áàảãạăắằẳẵặâấầẩẫậéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵđ', 'aaaaaaaaaaaaaaaaaeeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyyyd')`);
            values.push(`%${home.trim()}%`);
            paramIndex++;
        }
        if (deathYear && deathYear.trim() !== '') {
            conditions.push(`nam_hy_sinh LIKE $${paramIndex}`);
            values.push(`%${deathYear.trim()}%`);
            paramIndex++;
        }

        if (conditions.length > 0) {
            baseQuery += ` WHERE ` + conditions.join(' AND ');
        }

        baseQuery += ` ORDER BY CAST(NULLIF(TRIM(so_tt), '') AS INT) ASC NULLS LAST`;

        const result = await pool.query(baseQuery, values);
        res.json(result.rows);
    } catch (err) { 
        console.error(err);
        res.status(500).json({ error: "Lỗi Server API Đền Thờ" }); 
    }
});

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
    } catch (err) { res.status(500).json({ error: "Lỗi chi tiết" }); }
});

app.post('/api/sync-webhook', async (req, res) => {
    await dongBoToanBoDuLieu();
    res.json({ message: "Đồng bộ thành công!" });
});

app.get('/api/sync-data', async (req, res) => {
    await dongBoToanBoDuLieu();
    res.json({ message: "Đã cập nhật dữ liệu!" });
});

app.listen(port, async () => { 
    console.log(`Server đang chạy tại cổng ${port}`); 
    await dongBoToanBoDuLieu(); 
});
