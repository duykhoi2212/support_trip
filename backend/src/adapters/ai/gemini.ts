import { GoogleGenerativeAI } from '@google/generative-ai';
import { format, addDays } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

const VN_TIMEZONE = 'Asia/Ho_Chi_Minh';

export interface AiParsedSearchResult {
  origin_name?: string;
  dest_name?: string;
  departure_date?: string; // YYYY-MM-DD
  type?: 'RIDE' | 'PACKAGE';
  passenger_count?: number;
  explanation: string;
  is_fallback: boolean;
}

export class GeminiAdapter {
  /**
   * Phân tích câu tìm kiếm tự nhiên của người dùng thành tiêu chí tìm kiếm có cấu trúc.
   * Nếu Gemini API lỗi, hết hạn, hoặc chưa có API key, tự động chuyển về Regex Fallback Engine (CS-05).
   */
  static async parseSearchPrompt(prompt: string): Promise<AiParsedSearchResult> {
    if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
      return {
        explanation: 'Không có nội dung tìm kiếm.',
        is_fallback: true,
      };
    }

    const trimmedPrompt = prompt.trim();
    const apiKey = process.env.GEMINI_API_KEY?.trim();

    // 1. Kiểm tra API Key: nếu không có, chuyển ngay sang CS-05 Fallback
    if (!apiKey) {
      return this.parseWithRegexFallback(trimmedPrompt);
    }

    try {
      const nowVn = toZonedTime(new Date(), VN_TIMEZONE);
      const todayFormatted = format(nowVn, 'yyyy-MM-dd');
      const dayOfWeek = format(nowVn, 'eeee');

      const genAI = new GoogleGenerativeAI(apiKey);
      const modelName = process.env.GEMINI_MODEL?.trim() || 'gemini-2.0-flash';
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          temperature: 0.1,
          responseMimeType: 'application/json',
        },
      });

      const systemPrompt = `Bạn là trợ lý AI thông minh của nền tảng kết nối đi nhờ và gửi đồ GoX tại Việt Nam.
Nhiệm vụ của bạn là phân tích câu yêu cầu tìm kiếm tự nhiên của người dùng và bóc tách thành đối tượng JSON chuẩn xác.

Thời gian hiện tại: ${todayFormatted} (${dayOfWeek}, múi giờ Việt Nam UTC+7).

Quy tắc bóc tách:
1. "origin_name": Tên địa điểm xuất phát / điểm đón khách (ví dụ: "Đà Nẵng", "Hà Nội", "Hải Châu", "Quận 1"). Bỏ các từ thừa như "từ", "ở", "tại", "đi từ".
2. "dest_name": Tên địa điểm đến / điểm trả khách (ví dụ: "Hội An", "Thái Bình", "Vũng Tàu"). Bỏ các từ thừa như "đến", "về", "tới", "sang".
3. "departure_date": Ngày khởi hành định dạng chuẩn YYYY-MM-DD. Tính toán dựa trên ngày hôm nay (${todayFormatted}).
   - Nếu nói "hôm nay": ${todayFormatted}
   - Nếu nói "ngày mai" hoặc "mai" hoặc "chiều mai" hoặc "sáng mai": lấy ngày mai
   - Nếu nói "thứ X này": tính ngày thứ X gần nhất kế tiếp
   - Nếu không đề cập ngày: trả về null
4. "type": "RIDE" (mặc định nếu đi nhờ xe, chở người) hoặc "PACKAGE" (nếu có từ "gửi đồ", "gửi hàng", "chuyển phát", "kiện hàng", "thùng đồ").
5. "passenger_count": Số lượng người đi (số nguyên >= 1, mặc định 1 nếu là RIDE; nếu là PACKAGE thì null).
6. "explanation": Một câu tóm tắt ngắn gọn, thân thiện bằng tiếng Việt (Ví dụ: "Tìm chuyến đi nhờ từ Đà Nẵng đến Hội An cho 2 người vào ngày 17/11/2026").

BẮT BUỘC trả về CHỈ MỘT chuỗi JSON hợp lệ với cấu trúc sau:
{
  "origin_name": string | null,
  "dest_name": string | null,
  "departure_date": string | null,
  "type": "RIDE" | "PACKAGE",
  "passenger_count": number | null,
  "explanation": string
}`;

      // Tạo timeout 6000ms để không làm người dùng chờ lâu
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('GEMINI_TIMEOUT')), 6000)
      );

      const generatePromise = model.generateContent([
        { text: systemPrompt },
        { text: `Yêu cầu của người dùng: "${trimmedPrompt}"` },
      ]);

      const response: any = await Promise.race([generatePromise, timeoutPromise]);
      const text = response.response.text();

      // Bóc tách JSON an toàn
      const cleanedText = text.replace(/```json\n?|\n?```/g, '').trim();
      const parsed = JSON.parse(cleanedText);

      return {
        origin_name: parsed.origin_name || undefined,
        dest_name: parsed.dest_name || undefined,
        departure_date: parsed.departure_date || undefined,
        type: parsed.type === 'PACKAGE' ? 'PACKAGE' : 'RIDE',
        passenger_count: parsed.passenger_count ? Number(parsed.passenger_count) : 1,
        explanation: parsed.explanation || `Tìm chuyến xe từ ${parsed.origin_name || '...'} đến ${parsed.dest_name || '...'}`,
        is_fallback: false,
      };
    } catch (error) {
      // Khi gặp bất kỳ lỗi nào từ API Gemini (timeout, rate limit, quota, invalid key) -> kích hoạt CS-05
      return this.parseWithRegexFallback(trimmedPrompt);
    }
  }

  /**
   * Cơ chế Dự phòng CS-05: Phân tích bằng Regex & Luật ngôn ngữ tự nhiên tiếng Việt
   */
  static parseWithRegexFallback(prompt: string): AiParsedSearchResult {
    const lower = prompt.toLowerCase();
    const nowVn = toZonedTime(new Date(), VN_TIMEZONE);

    // 1. Phân loại yêu cầu (RIDE vs PACKAGE)
    const isPackage = /(gửi|chuyển|nhận)\s+(hàng|đồ|kiện|bưu phẩm|thùng|hộp)/i.test(prompt) ||
      /(kiện hàng|thùng đồ|gói hàng)/i.test(prompt);
    const type: 'RIDE' | 'PACKAGE' = isPackage ? 'PACKAGE' : 'RIDE';

    // 2. Số lượng người (nếu là RIDE)
    let passengerCount = 1;
    const passengerMatch = prompt.match(/(\d+)\s*(người|chỗ|vé|khách|bạn)/i);
    if (passengerMatch && passengerMatch[1]) {
      passengerCount = Math.max(1, parseInt(passengerMatch[1], 10));
    }

    // 3. Phân tích Ngày khởi hành
    let departureDate: string | undefined = undefined;

    if (/(hôm nay|nay)/i.test(lower)) {
      departureDate = format(nowVn, 'yyyy-MM-dd');
    } else if (/(ngày mai|sáng mai|chiều mai|tối mai|\bmai\b)/i.test(lower)) {
      departureDate = format(addDays(nowVn, 1), 'yyyy-MM-dd');
    } else if (/(ngày mốt|mốt)/i.test(lower)) {
      departureDate = format(addDays(nowVn, 2), 'yyyy-MM-dd');
    } else {
      // Tìm định dạng dd/mm/yyyy hoặc dd/mm
      const dateMatch = prompt.match(/(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{4}))?/);
      if (dateMatch) {
        const day = parseInt(dateMatch[1], 10);
        const month = parseInt(dateMatch[2], 10);
        const year = dateMatch[3] ? parseInt(dateMatch[3], 10) : nowVn.getFullYear();
        try {
          const customDate = new Date(year, month - 1, day);
          if (!isNaN(customDate.getTime())) {
            departureDate = format(customDate, 'yyyy-MM-dd');
          }
        } catch {
          // ignore
        }
      }
    }

    // 4. Phân tích Điểm đi (origin) & Điểm đến (dest)
    let originName: string | undefined = undefined;
    let destName: string | undefined = undefined;

    // Mẫu 1: "từ [A] đến/về/đi/tới [B]"
    const fromToMatch = prompt.match(/(?:từ|ở|tại)\s+([^,.\n]+?)\s+(?:đến|về|đi|tới|sang)\s+([^,.\n]+?)(?:\s+(?:ngày|chiều|sáng|tối|vào|lúc|\d+|hôm|mai|thứ)|$)/i);
    if (fromToMatch) {
      originName = this.cleanLocationName(fromToMatch[1]);
      destName = this.cleanLocationName(fromToMatch[2]);
    } else {
      // Mẫu 2: "[A] đến/về/đi/tới [B]"
      const directMatch = prompt.match(/([^,.\n]+?)\s+(?:đến|về|đi|tới|sang)\s+([^,.\n]+?)(?:\s+(?:ngày|chiều|sáng|tối|vào|lúc|\d+|hôm|mai|thứ)|$)/i);
      if (directMatch) {
        originName = this.cleanLocationName(directMatch[1]);
        destName = this.cleanLocationName(directMatch[2]);
      }
    }

    // Xây dựng câu tóm tắt
    let explanation = `Bộ lọc dự phòng: Tìm chuyến ${type === 'RIDE' ? 'đi nhờ' : 'gửi hàng'}`;
    if (originName) explanation += ` từ "${originName}"`;
    if (destName) explanation += ` đến "${destName}"`;
    if (departureDate) explanation += ` ngày ${departureDate}`;
    if (type === 'RIDE' && passengerCount > 1) explanation += ` (${passengerCount} người)`;

    return {
      origin_name: originName || undefined,
      dest_name: destName || undefined,
      departure_date: departureDate,
      type,
      passenger_count: passengerCount,
      explanation,
      is_fallback: true,
    };
  }

  private static cleanLocationName(raw: string): string {
    return raw
      .replace(/^(tìm xe|xe|cần tìm|cần đi|muốn đi|cho tôi|đặt xe|đi nhờ|gửi đồ|gửi hàng)\s+/i, '')
      .replace(/\s+(chiều|sáng|tối|ngày|lúc|khoảng)\s*$/i, '')
      .trim();
  }
}
