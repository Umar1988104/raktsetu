// Shown wherever numbers might include sample data from seed-demo.js, so
// they can't be mistaken for real usage.
export default function DemoNotice({ show }) {
  if (!show) return null;
  return (
    <span className="pill pill-expired" title="Some of these numbers come from sample demo data">
      Includes demo data
    </span>
  );
}
