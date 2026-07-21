import { getToothType } from "../../config/dtgUtils.js";
import { ModuleIcon } from "../../shared/DentalToothGridIcons.jsx";

/** Smaller icons when several modules share one crown so they stay inside the tooth body */
function moduleDensityClass(count) {
  if (count <= 1) return "";
  if (count === 2) return "dtg-tooth-body--mods2";
  if (count === 3) return "dtg-tooth-body--mods3";
  return "dtg-tooth-body--mods4plus";
}

function moduleIconSvgSize(count) {
  if (count <= 1) return 14;
  if (count === 2) return 11;
  if (count === 3) return 9;
  return 7;
}

export default function Tooth({
  num,
  arch,
  modules,
  hasComment,
  dragOver,
  onDragOver,
  onDragLeave,
  onDrop,
  onClick,
  onRemoveModule,
  onEditComment,
}) {
  const type = getToothType(num);
  const isUpper = arch === "upper";
  const firstMod = modules[0] || null;
  const crownStyle = firstMod
    ? { "--ta": firstMod.color, "--ta-bg": firstMod.bg }
    : {};

  const modCount = modules.length;
  const iconSize = moduleIconSvgSize(modCount);

  const crown = (
    <span
      className={[
        "dtg-tooth-body",
        moduleDensityClass(modCount),
        firstMod ? "dtg-tooth-body--active" : "",
        dragOver ? "dtg-tooth-body--dragover" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={crownStyle}
    >
      {modules.map((mod) => (
        <button
          key={mod.id}
          type="button"
          className="dtg-tooth-mod-btn"
          style={{ color: mod.color }}
          onClick={(e) => {
            e.stopPropagation();
            mod.id === "comment"
              ? onEditComment(num)
              : onRemoveModule(num, mod.id);
          }}
          title={
            mod.id === "comment"
              ? hasComment
                ? "Edit comment"
                : "Add comment"
              : `${mod.label} – click to remove`
          }
          aria-label={
            mod.id === "comment"
              ? `Edit comment on tooth ${num}`
              : `Remove ${mod.label} from tooth ${num}`
          }
        >
          <ModuleIcon mod={mod} svgSize={iconSize} />
        </button>
      ))}
    </span>
  );

  return (
    <div
      className={[
        "dtg-tooth",
        `dtg-tooth--${type}`,
        isUpper ? "dtg-tooth--upper" : "dtg-tooth--lower",
        dragOver ? "dtg-tooth--dragover" : "",
        modules.length > 0 ? "dtg-tooth--has-module" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={firstMod ? { "--ta": firstMod.color, "--ta-bg": firstMod.bg } : {}}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick(e)}
      aria-label={`Tooth ${num}${modules.length > 0 ? `: ${modules.map((m) => m.label).join(", ")}` : ""}`}
    >
      {isUpper ? (
        <>
          <span className="dtg-tooth-num">{num}</span>
          <span className="dtg-tooth-crown-root">
            <span className="dtg-tooth-root" />
            {crown}
          </span>
        </>
      ) : (
        <>
          <span className="dtg-tooth-crown-root">
            {crown}
            <span className="dtg-tooth-root" />
          </span>
          <span className="dtg-tooth-num">{num}</span>
        </>
      )}
    </div>
  );
}
