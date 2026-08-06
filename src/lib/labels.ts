export const projectStatusLabel: Record<string, string> = {
  DRAFT: "Ноорог",
  ACTIVE: "Хэвийн",
  ON_HOLD: "Хүлээгдэж буй",
  AT_RISK: "Эрсдэлтэй",
  COMPLETED: "Дууссан",
  CANCELLED: "Цуцлагдсан",
};

export const taskStatusLabel: Record<string, string> = {
  DRAFT: "Ноорог",
  ASSIGNED: "Оноогдсон",
  IN_PROGRESS: "Явцад",
  BLOCKED: "Хориглогдсон",
  WAITING: "Хүлээгдэж байна",
  SUBMITTED: "Илгээсэн",
  UNDER_REVIEW: "Шалгагдаж буй",
  CHANGES_REQUIRED: "Засвар шаардлагатай",
  APPROVED: "Батлагдсан",
  REJECTED: "Татгалзсан",
  COMPLETED: "Дууссан",
  OVERDUE: "Хоцорсон",
  CANCELLED: "Цуцлагдсан",
};

export const memberStatusLabel: Record<string, string> = {
  INVITED: "Урьсан",
  ACTIVE: "Идэвхтэй",
  SUSPENDED: "Түдгэлзсэн",
  ARCHIVED: "Идэвхгүй",
};

export const okStatuses = new Set(["ACTIVE", "APPROVED", "COMPLETED", "PRESENT"]);

export const roleLabel: Record<string, string> = {
  EMPLOYEE: "Ажилтан",
  TEAM_LEAD: "Багийн ахлагч",
  MANAGER: "Менежер",
  HR: "HR",
  EXECUTIVE: "Гүйцэтгэх удирдлага",
  ADMIN: "Админ",
};

export const attendanceStatusLabel: Record<string, string> = {
  PRESENT: "Ирсэн",
  LATE: "Хоцорсон",
  ABSENT: "Ирээгүй",
  REMOTE: "Зайнаас",
  FIELD_WORK: "Талбайд",
  BUSINESS_TRIP: "Албан томилолт",
  HALF_DAY: "Хагас өдөр",
};

export const leaveTypeLabel: Record<string, string> = {
  ANNUAL: "Ээлжийн амралт",
  SICK: "Өвчний чөлөө",
  UNPAID: "Цалингүй чөлөө",
  OTHER: "Бусад",
};

export const leaveStatusLabel: Record<string, string> = {
  PENDING: "Хүлээгдэж буй",
  APPROVED: "Зөвшөөрсөн",
  REJECTED: "Татгалзсан",
};

export const handoverTransferTypeLabel: Record<string, string> = {
  TEMPORARY: "Түр шилжүүлэг",
  PERMANENT: "Бүрэн шилжүүлэг",
};

export const taskRiskLevelLabel: Record<string, string> = {
  LOW: "Бага",
  MEDIUM: "Дунд",
  HIGH: "Өндөр",
  CRITICAL: "Маш өндөр",
};

export const taskDependencyTypeLabel: Record<string, string> = {
  FINISH_TO_START: "Өмнөх дуусаад эхэлнэ (FS)",
  START_TO_START: "Хамт эхэлнэ (SS)",
  FINISH_TO_FINISH: "Хамт дуусна (FF)",
};

export const taskBlockReasonLabel: Record<string, string> = {
  MISSING_DOCUMENT: "Баримт бичиг дутуу",
  WAITING_APPROVAL: "Зөвшөөрөл хүлээж байна",
  WAITING_SUPPLIER: "Нийлүүлэгч хүлээж байна",
  WAITING_CUSTOMER: "Захиалагч хүлээж байна",
  WAITING_PAYMENT: "Төлбөр хүлээж байна",
  MISSING_MATERIAL: "Материал дутуу",
  TECHNICAL_ISSUE: "Техникийн асуудал",
  SYSTEM_ISSUE: "Системийн асуудал",
  PREVIOUS_TASK_INCOMPLETE: "Өмнөх ажил дуусаагүй",
  OTHER: "Бусад",
};

export const stockMovementTypeLabel: Record<string, string> = {
  RECEIPT: "Хүлээн авалт",
  ISSUE: "Зарлага",
  ADJUSTMENT: "Тохируулга",
};

export const purchaseOrderStatusLabel: Record<string, string> = {
  OPEN: "Нээлттэй",
  RECEIVED: "Хүлээн авсан",
  CLOSED: "Хаагдсан",
};

export const inventoryMismatchTypeLabel: Record<string, string> = {
  MISSING: "Дутуу",
  DAMAGED: "Гэмтэлтэй",
  WRONG_PRODUCT: "Буруу бараа",
  WRONG_QUANTITY: "Буруу тоо хэмжээ",
  EXPIRED: "Хугацаа дууссан",
  PACKAGING_DAMAGE: "Баглаа боодол гэмтсэн",
  SERIAL_MISMATCH: "Серийн дугаар зөрсөн",
  DUPLICATE: "Давхардсан",
  OTHER: "Бусад",
};

export const inventoryMismatchStatusLabel: Record<string, string> = {
  OPEN: "Нээлттэй",
  RESOLVED: "Шийдвэрлэсэн",
};

export const inventoryMismatchSourceLabel: Record<string, string> = {
  RECEIPT: "Хүлээн авалт",
  COUNT: "Тооллого",
  THREE_WAY: "3 талт тулгалт",
};

export const evidenceTypeLabel: Record<string, string> = {
  PHOTO: "Зураг",
  BEFORE_AFTER: "Өмнөх/Дараах зураг",
  VIDEO: "Видео",
  PDF: "PDF",
  WORD: "Word",
  EXCEL: "Excel",
  DOCUMENT: "Баримт",
  BARCODE: "Barcode",
  QR: "QR код",
  CHECKLIST: "Чеклист",
  QUANTITY: "Тоо хэмжээ",
  GPS: "Байршил",
  DIGITAL_SIGNATURE: "Цахим гарын үсэг",
  CUSTOMER_SIGNATURE: "Захиалагчийн гарын үсэг",
  NOTE: "Тэмдэглэл",
  URL: "Холбоос",
};
