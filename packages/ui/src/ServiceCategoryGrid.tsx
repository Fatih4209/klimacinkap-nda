import { serviceCategories, type ServiceCategoryId } from "@klimacin/config";

type ServiceCategoryGridProps = {
  onSelect?: (id: ServiceCategoryId) => void;
  disabledReason?: string;
};

export function ServiceCategoryGrid({
  onSelect,
  disabledReason,
}: ServiceCategoryGridProps) {
  return (
    <div>
      <div className="kk-category-grid" role="list">
        {serviceCategories.map((category) => (
          <button
            key={category.id}
            type="button"
            role="listitem"
            className="kk-category-tile"
            data-accent={category.id}
            disabled={!onSelect}
            aria-label={category.label}
            onClick={() => onSelect?.(category.id)}
          >
            <strong style={{ fontSize: "1.25rem" }}>{category.label}</strong>
            <span style={{ color: "var(--kk-text-secondary)", fontSize: "0.95rem" }}>
              {category.description}
            </span>
          </button>
        ))}
      </div>
      {disabledReason ? (
        <p className="kk-empty" style={{ marginTop: "1rem" }}>
          {disabledReason}
        </p>
      ) : null}
    </div>
  );
}
