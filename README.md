# Trading Journal Calendar

ปฏิทินบันทึกผลการเทรดส่วนตัว รองรับมือถือและคอมพิวเตอร์ พร้อมระบบล็อกอินและซิงก์ข้อมูลผ่าน Supabase

## Environment variables

ตั้งค่าตัวแปรต่อไปนี้ในระบบโฮสต์ ห้ามใส่ค่าจริงลงใน GitHub:

- `APP_USERNAME`
- `SUPABASE_LOGIN_EMAIL`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

## Supabase

เรียกใช้ `supabase/setup.sql` หนึ่งครั้งใน Supabase SQL Editor จากนั้นสร้างผู้ใช้ใน Authentication

## Deploy

โปรเจกต์รองรับ Next.js บน Vercel โดยอัตโนมัติ และใช้ vinext สำหรับ Cloudflare/Sites

```bash
npm install
npm run build
```

การทดสอบ production build บนเครื่อง:

```bash
npm run build:next
npm start
```
