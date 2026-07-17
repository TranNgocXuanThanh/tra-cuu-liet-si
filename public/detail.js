// detail.js - Lấy chi tiết dữ liệu trực tiếp từ SQL thông qua Backend
window.onload = async function() {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id'); // Lấy ID khóa chính truyền từ trang chủ sang[cite: 8]

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
        
        // Đổ dữ liệu chữ khớp chính xác với tên cột trong PostgreSQL của bạn[cite: 8]
        document.getElementById("p_name").innerText = data.ho_va_ten ||"Liệt sĩ";
        document.getElementById("p_birth").innerText = data.nam_sinh || "Trống";
        document.getElementById("p_home").innerText = data.que_quan || "Trống";
        document.getElementById("p_death").innerText = data.ngay_hy_sinh || "Trống";
        document.getElementById("p_deathPlace").innerText = data.noi_hy_sinh || "Trống";
        document.getElementById("p_unit").innerText = data.don_vi || "Trống";
        
        // Định dạng thông tin vị trí mộ[cite: 8]
        document.getElementById("p_area").innerText = "Trống";
        document.getElementById("p_row").innerText = data.hang || "Trống";
        document.getElementById("p_grave").innerText = data.so_mo || "Trống";
        
        // Hiển thị tiểu sử[cite: 8]
        document.getElementById("p_bio").innerText = data.tieu_su || "Đang cập nhật thông tin tiểu sử...";

        // BỔ SUNG hiển thị cột Sở thích (Nếu trên giao diện HTML có thẻ tương ứng, ví dụ id="p_hobby")
        const hobbyElement = document.getElementById("p_hobby");
        if (hobbyElement) {
            hobbyElement.innerText = data.so_thich || "Trống";
        }

        // Xử lý hiển thị Ảnh[cite: 8]
        const imgElement = document.getElementById("p_image");
        const noImgText = document.getElementById("no_image_text");

        if (data.anh_url && data.anh_url.trim() !== "") {
            // Nếu database có link ảnh -> Gắn đường dẫn vào src, hiện ảnh, ẩn chữ[cite: 8]
            imgElement.src = data.anh_url;
            imgElement.style.display = "block";
            noImgText.style.display = "none";
        } else {
            // Nếu không có ảnh hoặc trống -> Ẩn ảnh, hiện chữ "Ảnh" dự phòng[cite: 8]
            imgElement.style.display = "none";
            noImgText.style.display = "block";
        }

    } catch (error) {
        console.error("Lỗi tải chi tiết:", error);
        alert("Lỗi khi tải chi tiết dữ liệu từ cơ sở dữ liệu SQL!");
    }
};
