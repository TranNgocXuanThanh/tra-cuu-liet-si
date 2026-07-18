// detail.js - Lấy chi tiết dữ liệu trực tiếp từ SQL thông qua Backend
window.onload = async function() {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id'); // Lấy ID khóa chính truyền từ trang chủ sang

    if (!id) {
        alert("Không tìm thấy thông tin liệt sĩ!");
        window.location.href = "index.html";
        return;
    }

    try {
        // Gọi API đến Server để lấy thông tin chi tiết của liệt sĩ theo ID thật trong SQL
        const response = await fetch(`/api/martyrs/${id}`);
        
        if (response.status === 404) {
            alert("Thông tin liệt sĩ không tồn tại trong hệ thống!");
            window.location.href = "index.html";
            return;
        }

        if (!response.ok) throw new Error('Lỗi kết nối mạng hoặc lỗi server');

        const data = await response.json();
        
        // 1. Đổ dữ liệu chữ khớp chính xác với tên cột trong PostgreSQL của bạn
        document.getElementById("p_name").innerText = data.ho_va_ten || "Liệt sĩ";
        document.getElementById("p_birth").innerText = data.nam_sinh || "";
        document.getElementById("p_home").innerText = data.que_quan || "";
        document.getElementById("p_death").innerText = data.ngay_hy_sinh || "";
        document.getElementById("p_deathPlace").innerText = data.noi_hy_sinh || "";
        document.getElementById("p_unit").innerText = data.don_vi || "";
        
        // 2. Định dạng thông tin vị trí mộ
        document.getElementById("p_area").innerText = data.khu_lo || data.khu || ""; // Đã nạp lại biến hiển thị Khu/Lô dự phòng nếu trống
        document.getElementById("p_row").innerText = data.hang || "";
        document.getElementById("p_grave").innerText = data.so_mo || "";
        
        // 3. Hiển thị tiểu sử
        document.getElementById("p_bio").innerText = data.tieu_su || "Đang cập nhật thông tin tiểu sử...";

        // 4. Hiển thị cột Sở thích (Nếu trên giao diện HTML có thẻ tương ứng)
        const hobbyElement = document.getElementById("p_hobby");
        if (hobbyElement) {
            hobbyElement.innerText = data.so_thich || "Trống";
        }

        // ĐOẠN XỬ LÝ ẢNH ĐÃ ĐƯỢC XÓA BỎ HOÀN TOÀN:
        // Việc hiển thị hình tượng trưng tĩnh lúc này sẽ do thẻ <img> trong file HTML tự đảm nhận.

    } catch (error) {
        console.error("Lỗi tải chi tiết:", error);
        alert("Lỗi khi tải chi tiết dữ liệu từ cơ sở dữ liệu SQL!");
    }
};
