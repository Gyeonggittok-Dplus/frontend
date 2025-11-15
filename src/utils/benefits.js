const ensureAbsoluteUrl = (value = "") => {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.includes(".")) {
    return `https://${trimmed}`;
  }
  return "";
};

export const resolveBenefitLink = (item = {}) => {
  const candidates = [
    item.link,
    item.service_url,
    item.url,
    item.apply_method,
  ];
  for (const candidate of candidates) {
    if (typeof candidate !== "string") continue;
    const normalized = ensureAbsoluteUrl(candidate);
    if (normalized) return normalized;
  }
  return "";
};

export const normalizeBenefitItem = (item, fallbackId = 0) => {
  const descriptionCandidates = [
    item?.desc,
    item?.description,
    item?.target,
    item?.support_cycle,
    item?.apply_method,
  ].filter(Boolean);
  return {
    id:
      item?.id ??
      item?.benefit_id ??
      item?.service_id ??
      item?.service_name ??
      item?.service_url ??
      fallbackId,
    title: item?.title ?? item?.service_name ?? "복지 서비스",
    desc:
      descriptionCandidates.join(" · ") ||
      "자세한 내용은 상세 페이지에서 확인해 주세요.",
    region: item?.region ?? item?.sigun_name ?? item?.location ?? "경기도",
    category: item?.category ?? item?.department ?? "복지",
    link: resolveBenefitLink(item),
  };
};

export const filterBenefitsByRegion = (items, region) => {
  if (!Array.isArray(items) || !items.length) return [];
  if (!region) return items;
  const trimmed = region.trim();
  const filtered = items.filter((item) => {
    const candidate =
      (typeof item.region === "string" && item.region.trim()) ||
      (typeof item.sigun_name === "string" && item.sigun_name.trim()) ||
      (typeof item.location === "string" && item.location.trim());
    return candidate === trimmed;
  });
  return filtered.length ? filtered : items;
};
