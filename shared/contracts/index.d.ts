export const CONTRACT_VERSION: number;
export const PROPERTY_TYPES: readonly string[];
export const PURPOSES: readonly string[];
export const LISTING_STATUSES: readonly string[];
export const MARKET_STATUSES: readonly string[];
export const BOOKING_STATUSES: readonly string[];
export const BOOKING_SLOTS: readonly string[];
export const BOOKING_TIME_ZONE: string;
export const BOOKING_TRANSITIONS: Readonly<Record<string, readonly string[]>>;
export class ContractError extends Error { statusCode: number; code: string; fields: Record<string, string>; constructor(message: string, field?: string, statusCode?: number, code?: string); }
export function object(value: unknown, field?: string): Record<string, any>;
export function keys(value: any, allowed: string[]): Record<string, any>;
export function text(value: unknown, field: string, options?: {min?: number; max?: number; optional?: boolean}): string;
export function number(value: unknown, field: string, options?: {min?: number; max?: number; integer?: boolean}): number;
export function id(value: unknown, field?: string): string;
export function choice<T>(value: unknown, allowed: readonly T[], field: string): T;
export function email(value: unknown): string;
export function password(value: unknown, field?: string): string;
export function phone(value: unknown, optional?: boolean): string;
export function safeUrl(value: unknown, field: string, googleOnly?: boolean): string;
export function normalizePropertyType(value: unknown): string;
export function normalizePurpose(value: unknown): string;
export function stringArray(value: unknown, field: string, max?: number): string[];
export function parseListing(input: unknown, options?: {partial?: boolean}): Record<string, any>;
export function parsePage(input?: any, defaultLimit?: number): {page: number; limit: number; skip: number};
export interface PageDTO { currentPage: number; limit: number; total: number; totalPages: number; hasNextPage: boolean; hasPreviousPage: boolean; }
export function pageDTO(total: number, page: number, limit: number): PageDTO;
export function bookingInstant(date: string, time: string): Date;
export function parseBooking(input: unknown, authenticated?: boolean, now?: number): Record<string, any>;
export function propertyDTO(source: any, privateFields?: boolean): PropertyDTO;
export function appointmentDTO(source: any): AppointmentDTO;

export type ListingStatus = 'pending' | 'active' | 'rejected' | 'expired' | 'archived';
export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';
export interface PropertyDTO {
  _id: string; title: string; location: string; price: number; beds: number; baths: number; sqft: number;
  type: string; purpose: 'sale' | 'rent'; availability: 'sale' | 'rent'; marketStatus: 'available' | 'sold' | 'rented';
  description: string; phone: string; image: string[]; amenities: string[]; googleMapLink: string;
  status: ListingStatus; version: number; expiresAt: string | null; createdAt: string; updatedAt: string;
  postedBy?: string; rejectionReason?: string; archivedAt?: string;
}
export interface AppointmentDTO {
  _id: string; propertyId: Pick<PropertyDTO, '_id' | 'title' | 'location' | 'image'> | null;
  userId?: { _id: string; name: string; email: string } | null;
  guestInfo?: { name: string; email: string; phone: string };
  propertySnapshot?: { title: string; location: string; image: string[]; phone: string; unavailable?: boolean };
  contactSnapshot?: { name: string; email: string; phone: string; unavailable?: boolean };
  date: string; time: string; startsAt?: string; endsAt?: string; timeZone: string; status: BookingStatus;
  meetingLink?: string; notes?: string; cancelReason?: string; feedback?: { rating: number; comment: string };
  version: number; createdAt: string; updatedAt: string;
}
export interface AppointmentPage { success: boolean; appointments: AppointmentDTO[]; pagination: PageDTO; statusCounts: Partial<Record<BookingStatus, number>>; upcomingCount: number; }
export interface PropertyPage { success: boolean; properties: PropertyDTO[]; pagination: PageDTO & { totalProperties: number }; statusCounts?: Partial<Record<ListingStatus, number>>; }
export function reviewCommand(record: {version: number}, reason?: string): { expectedVersion: number; reason?: string };

export function createQueryCache(options?: { maxEntries?: number; ttl?: number }): {
  get<T>(key: string, fetcher: () => Promise<T>, signal?: AbortSignal): Promise<T>;
  clear(): void;
};
