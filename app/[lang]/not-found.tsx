export default function NotFound() {
  return (
    <main className="shell section" style={{paddingTop: 80, paddingBottom: 80}}>
      <p className="eyebrow">404</p>
      <h1>الصفحة غير موجودة · Page not found</h1>
      <p>تحقق من الرابط أو ارجع للرئيسية. Check the address or return home.</p>
      <div className="city-links">
        <a href="/ar">الرئيسية</a>
        <a href="/en">Home</a>
      </div>
    </main>
  );
}
