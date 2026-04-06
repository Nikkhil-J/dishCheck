/**
 * @deprecated Import SUPPORTED_CITIES, City, and CITY_AREAS from '@/lib/constants' instead.
 * This file exists only to avoid breaking existing imports.
 */
export { SUPPORTED_CITIES as CITIES, type City, CITY_AREAS } from './constants'

/** @deprecated Use CITY_AREAS.Gurugram directly. */
export const GURUGRAM_AREAS = [
  'Sector 29',
  'Cyber City',
  'Golf Course Road',
  'DLF Phase 1',
  'Sohna Road',
  'MG Road',
  'Udyog Vihar',
  'Sector 14',
] as const
