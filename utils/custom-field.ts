export const parseSelectOptions = (optionsJson?: string | null): string[] => {
  if (!optionsJson) {
    return [];
  }

  try {
    const parsed = JSON.parse(optionsJson);
    if (Array.isArray(parsed)) {
      return parsed.filter((option): option is string => typeof option === 'string');
    }
    return [];
  } catch {
    return [];
  }
};

export const normalizeCustomFieldKey = (input: string): string => {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
};
