/**
 * ==========================================================================
 * JAVASCRIPT XỬ LÝ LOGIC RIÊNG CHO TRANG CHỦ
 * ==========================================================================
 */

// Hàm Đóng/Mở thanh Menu điều hướng (Thực thi khi nhấn nút 3 gạch trên Điện thoại)
function toggleMenu() {
    const navLinks = document.getElementById("navLinks");
    if (navLinks) {
        // Tận dụng class .show đang có sẵn trong file dashboard.css của bạn
        navLinks.classList.toggle("show");
    }
}

// Bạn có thể mở rộng thêm các tính năng tương tác của trang chủ tại đây trong tương lai
console.log("Trang chủ đã được tải và sẵn sàng hoạt động ổn định!");
