import { type Id } from '../../data';
import type { HistoryItem, Profile } from '../../state';
import type { ActivityHistoryItemDto, ReviewQueueItemDto, UpcomingReviewDto } from '../types';

const HISTORY_KIND: Record<ActivityHistoryItemDto['type'], HistoryItem['kind']> = {
  DIAGNOSTICO: 'Diagnóstico',
  EVALUACION_CORTA: 'Evaluación',
  REPASO: 'Repaso',
  EXAMEN_GLOBAL: 'Global',
};

function localDayNumber(date: Date): number {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000;
}

function formatHistoryDate(value: string, now: Date): string {
  const date = new Date(value);
  const dayDifference = localDayNumber(now) - localDayNumber(date);
  if (dayDifference === 0) return 'Hoy';
  if (dayDifference === 1) return 'Ayer';
  return new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short' })
    .format(date)
    .replace('.', '');
}

export function mapHistory(items: ActivityHistoryItemDto[], now: Date): Profile['history'] {
  return items.map((item) => ({
    kind: HISTORY_KIND[item.type],
    label: item.conceptName,
    score: item.score,
    passed: item.passed,
    date: formatHistoryDate(item.date, now),
  }));
}

export function mapReviews(
  due: ReviewQueueItemDto[],
  upcoming: UpcomingReviewDto[],
  now: Date,
  conceptIds: ReadonlyMap<string, Id>,
): Profile['reviews'] {
  const reviews: Profile['reviews'] = {};
  const seenProgress = new Set<string>();
  const seenConcepts = new Set<string>();
  const seenSlugs = new Set<Id>();

  for (const item of due) {
    const slug = conceptIds.get(item.conceptId);
    if (!slug || seenProgress.has(item.progressId) || seenConcepts.has(item.conceptId) || seenSlugs.has(slug)) continue;
    seenProgress.add(item.progressId);
    seenConcepts.add(item.conceptId);
    seenSlugs.add(slug);
    reviews[slug] = { dueIn: 0, fails: item.consecutiveLapses };
  }

  for (const item of upcoming) {
    const slug = conceptIds.get(item.conceptId);
    if (!slug || seenProgress.has(item.progressId) || seenConcepts.has(item.conceptId) || seenSlugs.has(slug)) continue;
    const reviewDate = new Date(item.nextReviewAt);
    const dueIn = Math.max(0, localDayNumber(reviewDate) - localDayNumber(now));
    seenProgress.add(item.progressId);
    seenConcepts.add(item.conceptId);
    seenSlugs.add(slug);
    reviews[slug] = { dueIn, fails: item.consecutiveLapses };
  }

  return reviews;
}
