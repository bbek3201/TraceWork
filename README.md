# EVIDO (TraceWork)

![Typing SVG](https://readme-typing-svg.demolab.com?font=Fira+Code&size=20&pause=1000&color=8B5CF6&center=true&vCenter=true&width=600&lines=EVIDO%20%E2%80%94%20Workforce%20%26%20Operations%20Management;Next.js%20%2B%20Prisma%20%2B%20PostgreSQL%20%2B%20NextAuth;%D0%90%D0%B6%D0%B8%D0%BB%20%D0%B1%D2%AF%D1%80%20%D0%B1%D0%B0%D1%82%D0%B0%D0%BB%D0%B3%D0%B0%D0%B0%D1%82%D0%B0%D0%B9)

Нотолгоонд суурилсан ажил, төсөл, гүйцэтгэлийн удирдлагын платформ. Гол зарчим: **Ажил бүр баталгаатай.**

GitHub: [bbek3201/TraceWork](https://github.com/bbek3201/TraceWork)

Next.js (App Router) + Prisma + PostgreSQL (Neon) + NextAuth дээр бүтээгдсэн, олон байгууллага (multi-tenant), монгол хэл дээрх ажлын урсгал, гүйцэтгэлийн удирдлагын систем.

## Түргэн эхлэл

```bash
bun install
cp .env.example .env   # DATABASE_URL, NEXTAUTH_SECRET-ээ тохируулна
bun run db:migrate
bun run db:seed        # жишээ байгууллага, ажилтан, төсөл, ажлын дата үүсгэнэ
bun run dev
```

`http://localhost:3000` дээр нээгдэнэ. Жишээ нэвтрэх мэдээлэл: `employee1@evido.mn` / `Password123!` (ADMIN эрхтэй). Шинэ байгууллага `/register` дээрээс өөрөө бүртгүүлж болно.

## Боломжууд

- **Байгууллага, гишүүнчлэл** — олон байгууллагад харьяалагдах боломжтой хэрэглэгч, нэвтрэхдээ байгууллага сонгох, урих/гишүүн нэмэх
- **Эрх удирдлага (RBAC)** — 6 үндсэн role (Ажилтан/Багийн ахлагч/Менежер/HR/Гүйцэтгэх удирдлага/Админ), permission-based хандалт
- **Төсөл, ажил** — ажлын төлөв шилжилтийн машин (state machine), эрсдэлийн түвшин, хамаарал (dependency), хойшлуулах/хориглох шалтгаан, шилжүүлэг (handover)
- **Ажлын загвар (template)** — давтагдах ажлын чеклист, нотолгооны шаардлагыг урьдчилан бэлдэх
- **Олон шатны баталгаажуулалт** — эрсдэлийн түвшнээс хамаарсан 1–3 шатны review/approval урсгал, чанарын үнэлгээ
- **Гүйцэтгэлийн оноо** — үндсэн оноо × хугацаа × чанар × нотолгооны коэффициент дээр суурилсан автомат тооцоолол
- **Нотолгоо** — файл хавсаргах, зурган/бичиг баримтын нотолгоо шаардлага, аутентификацитай татах route
- **Ирц, чөлөө** — өдөр тутмын ирц бүртгэл, чөлөөний хүсэлт/зөвшөөрөл
- **Агуулах** — бараа материал, захиалга (PO), хүлээн авалт, тооллого, 3 талт тулгалт, зөрүү (mismatch) удирдлага
- **Мэдэгдэл, аудит** — систем дотоод мэдэгдэл, бүх мутаци үйлдлийн audit log
- **Тайлан** — байгууллагын гүйцэтгэл, ирц, агуулахын нэгдсэн үзүүлэлт
- **Профайл** — өөрийн мэдээлэл харах, нэр/нууц үг солих

## Технологи

Next.js · React · TypeScript · Prisma · PostgreSQL (Neon) · NextAuth (Credentials + JWT) · Zod · Tailwind CSS

## Скриптүүд

```bash
bun run dev          # хөгжүүлэлтийн server
bun run build         # production build
bun run lint          # ESLint
bun run db:migrate    # Prisma migration
bun run db:seed       # жишээ дата
```

Дэлгэрэнгүй архитектур, ERD, permission матриц, ажлын урсгалын дүрмийг [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)-с үзнэ үү.
