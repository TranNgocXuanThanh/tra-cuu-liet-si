let currentPage = 1;
const rowsPerPage = 20;
let danhSachToanBo = []; // Biến lưu toàn bộ dữ liệu tải về

window.onload = function() {
    taiDuLieuBanDau();
    
    // Bắt sự kiện gõ phím trực tiếp để lọc mượt mà không cần nhấn Enter
    const searchInputs = document.querySelectorAll('.search-grid input');
    searchInputs.forEach(input => {
        input.addEventListener('input', function() {
            currentPage = 1;
            renderTable();
        });
    });
};

// Hàm bỏ dấu tiếng Việt chuẩn
function removeAccents(str) {
    if (!str) return '';
    return str.toString().normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .replace(/đ/g, 'd').replace(/Đ/g, 'D')
              .toLowerCase();
}

// Tải toàn bộ dữ liệu một lần duy nhất khi vào trang
async function taiDuLieuBanDau() {
    const tableBody = document.getElementById("tableBody");
    if (!tableBody) return;
    tableBody.innerHTML = `<tr><td colspan="8" style="padding: 20px;">Đang tải dữ liệu từ cơ sở dữ liệu...</td></tr>`;

    try {
        const response = await fetch(`/api/shrine-martyrs`);
        if (!response.ok) throw new Error("Lỗi tải dữ liệu");
        
        danhSachToanBo = await response.json();
        renderTable();
    } catch (error) {
        console.error(error);
        tableBody.innerHTML = `<tr><td colspan="8" style="color: red; padding: 20px;">Không thể kết nối với máy chủ SQL!</td></tr>`;
    }
}

async function renderTable() {
    const tableBody = document.getElementById("tableBody");
    if (!tableBody) return;

    // Thu thập từ khóa tìm kiếm và chuẩn hóa không dấu
    const sName = removeAccents(document.getElementById("t_name")?.value || '');
    const sBirth = removeAccents(document.getElementById("t_birth")?.value || '');
    const sHome = removeAccents(document.getElementById("t_home")?.value || '');
    const sDeath = removeAccents(document.getElementById("t_deathYear")?.value || '');

    // Lọc dữ liệu ngay trên trình duyệt (gần đúng, không dấu, không phân biệt hoa thường)
    const filteredData = danhSachToanBo.filter(item => {
        const nameMatch = removeAccents(item.name || '').includes(sName);
        const birthMatch = removeAccents(item.birth || '').includes(sBirth);
        const homeMatch = removeAccents(item.home || '').includes(sHome);
        const deathMatch = removeAccents(item.deathYear || '').includes(sDeath);

        return nameMatch && birthMatch && homeMatch && deathMatch;
    });

    tableBody.innerHTML = "";

    if (filteredData.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="8" style="color: red; font-weight: bold; padding: 20px;">Không tìm thấy thông tin phù hợp!</td></tr>`;
        renderPagination(0);
        return;
    }

    // Thực hiện phân trang trên tập dữ liệu đã lọc
    const startIndex = (currentPage - 1) * rowsPerPage;
    const pageData = filteredData.slice(startIndex, startIndex + rowsPerPage);

    pageData.forEach((item, index) => {
        let stt = startIndex + index + 1;
        
        let row = `<tr>
            <td>${stt}</td>
            <td><a href="temple_detail.html?id=${item.id}" class="martyr-link">${item.name}</a></td>
            <td>${item.birth || ""}</td>
            <td>${item.home || ""}</td>
            <td>${item.deathYear || ""}</td>
            <td>${item.board || ""}</td>
            <td>${item.row || ""}</td>
            <td>${item.col || ""}</td>
        </tr>`;
        tableBody.innerHTML += row;
    });

    renderPagination(filteredData.length);
}

function renderPagination(totalRows) {
    const pageCount = Math.ceil(totalRows / rowsPerPage);
    const pagination = document.getElementById("pagination");
    if (!pagination) return;
    pagination.innerHTML = "";
    for (let i = 1; i <= pageCount; i++) {
        let btn = document.createElement("button");
        btn.innerText = i;
        if (i === currentPage) btn.className = "active";
        btn.onclick = () => { currentPage = i; renderTable(); };
        pagination.appendChild(btn);
    }
}

function clearSearch() {
    document.getElementById("t_name").value = "";
    document.getElementById("t_birth").value = "";
    document.getElementById("t_home").value = "";
    document.getElementById("t_deathYear").value = "";
    currentPage = 1;
    renderTable();
}

// Hàm Đóng/Mở Menu trên điện thoại
function toggleMenu() {
    const nav = document.getElementById("navLinks");
    nav.classList.toggle("show");
}
