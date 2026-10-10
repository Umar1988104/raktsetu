import { CHANGELOG } from "../data/changelog";
import { useLang } from "../i18n";

export default function UpdatesPage() {
  const { t } = useLang();
  return (
    <div>
      <div className="page-header">
        <h1>{t("What's new")}</h1>
        <p>Everything that's been added to RaktSetu so far, newest first.</p>
      </div>

      <div className="card">
        <ul className="timeline">
          {CHANGELOG.map((e) => (
            <li key={e.version}>
              <span className="tl-version">{e.version}</span>
              <span className="tl-title">{e.title}</span>
              <ul>
                {e.items.map((item) => (
                  <li key={item} style={{ border: "none", padding: 0, margin: 0, listStyle: "disc" }}>
                    {item}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
