export default function Method({ go }) {
  return (
    <div className="stack narrow prose">
      <h1>Phương pháp học</h1>
      <p>
        Trình độ A1 cần khoảng <strong>80–150 giờ học</strong> và ~650 từ vựng. Muốn đạt trong 30 ngày, bạn cần <strong>khoảng 1,5–2,5 giờ mỗi ngày</strong>, không bỏ ngày nào: ~75 phút bài học trong app + 15 phút ôn thẻ + thời gian nghe thêm. Lộ trình này được thiết kế dựa trên những kỹ thuật đã được nghiên cứu chứng minh hiệu quả nhất:
      </p>

      <div className="card">
        <h3>1. Phát âm trước tiên</h3>
        <p>
          Sáu ngày đầu tập trung vào hệ thống âm. Mỗi ngày sau đó luyện thêm một điểm phát âm. Học từ mới với <strong>bản ghi âm thật của người bản xứ</strong> + <strong>phiên âm IPA</strong> ngay từ đầu giúp bạn không phải "sửa" thói quen sai sau này. Các lỗi phổ biến của người Việt (nuốt phụ âm cuối, chèn "ơ" vào cụm phụ âm, đọc ü thành "ư", r uốn lưỡi) được luyện riêng.
        </p>
      </div>

      <div className="card">
        <h3>2. Luyện tai bằng cặp âm tối thiểu</h3>
        <p>Phải <em>nghe</em> ra khác biệt thì mới <em>nói</em> được. Trò chơi Miete/Mitte, Tier/Tür… rèn tai phân biệt âm mà tiếng Việt không có.</p>
      </div>

      <div className="card">
        <h3>3. Shadowing & tự ghi âm</h3>
        <p>Nghe → nhại lại ngay → ghi âm → so sánh với bản mẫu. Đây là cách nhanh nhất để có ngữ điệu và nhịp điệu tự nhiên. Nút 🎤 kiểm tra xem máy có hiểu bạn nói gì không.</p>
      </div>

      <div className="card">
        <h3>4. Nhớ chủ động (Active Recall)</h3>
        <p>Phần Luyện tập buộc bạn tự lấy thông tin ra từ trí nhớ (gõ từ, chép chính tả, chọn mạo từ) thay vì đọc lại. Câu sai được hỏi lại ở cuối bài. Hãy đạt ≥ 80% trước khi sang ngày mới.</p>
      </div>

      <div className="card">
        <h3>5. Lặp lại ngắt quãng (Spaced Repetition)</h3>
        <p>Mỗi từ đã học trở thành một thẻ. Thuật toán (dựa trên SM-2) cho thẻ quay lại đúng lúc bạn sắp quên: 1 → 3 → 7 → 15 → 30+ ngày. 15 phút ôn mỗi ngày giữ được hàng trăm từ trong trí nhớ dài hạn.</p>
      </div>

      <div className="card">
        <h3>6. Xen kẽ (Interleaving) & mã hoá kép</h3>
        <p>
          Mỗi bài luyện trộn thêm từ của các ngày trước. Danh từ được tô màu theo giống (<span className="g-der g-text">der</span> · <span className="g-die g-text">die</span> · <span className="g-das g-text">das</span>) – màu + âm thanh + chữ viết giúp nhớ mạo từ tốt hơn.
        </p>
      </div>

      <div className="card">
        <h3>7. Đầu ra mỗi ngày</h3>
        <p>Mỗi bài kết thúc bằng một nhiệm vụ nói/viết thật. Tuần 4 luyện đúng format bài thi Goethe-Zertifikat A1 (Hören, Lesen, Schreiben, Sprechen).</p>
      </div>

      <div className="card">
        <h3>Học thêm ngoài app (khuyến khích)</h3>
        <ul>
          <li><strong>DW „Nicos Weg"</strong> (learngerman.dw.com) – khoá video A1 miễn phí, rất hợp để nghe thêm 15–20 phút mỗi ngày.</li>
          <li><strong>Easy German</strong> (YouTube) – phỏng vấn đường phố có phụ đề, bắt đầu từ tuần 3.</li>
          <li><strong>Bài thi mẫu</strong> Goethe-Zertifikat A1 (goethe.de) – làm thêm 1 đề ở ngày 29–30.</li>
        </ul>
      </div>

      <button className="btn primary" onClick={() => go('#/')}>Về lộ trình</button>
    </div>
  );
}
