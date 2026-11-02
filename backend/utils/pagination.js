import { parsePage, pageDTO } from '@buildestate/contracts';
export const pagination = parsePage;

export function pageMetadata(totalProperties, page, limit) {
  return { ...pageDTO(totalProperties, page, limit), totalProperties };
}

export const escapeRegex = value => String(value).slice(0, 200).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
