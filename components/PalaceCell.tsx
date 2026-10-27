'use client';
import { motion } from 'framer-motion';
import type { Palace, Star } from '@/lib/ziwei/types';
import { STEMS, BRANCHES } from '@/lib/ziwei/constants';
import clsx from 'clsx';
import { SIHUA_BADGE, BRIGHTNESS_COLOR, type SiHua, type StarBrightness } from '@/lib/ziwei/sihua-colors';

interface PalaceCellProps {
  palace: Palace;
  onClick?: () => void;
  onStarClick?: (star: Star) => void;
  isSelected?: boolean;
  isSanFang?: boolean;
  delay?: number;
  /** 叠加四化：星名 → 四化类型（'禄'/'权'/'科'/'忌'） */
  overlayStarSiHua?: Record<string, string>;
  /** 叠加标签：'年'（流年）或 '限'（大限） */
  overlayLabel?: string;
  /** 点击叠加四化 badge 回调 */
  onSiHuaClick?: (starName: string, siHua: string) => void;
}

const SiHuaBadge = ({
  siHua,
  overlay,
  label,
  onClick,
}: {
  siHua: string;
  overlay?: boolean;
  label?: string;
  onClick?: (e: React.MouseEvent) => void;
}) => {
  const sh = siHua as SiHua;
  return (
    <span
      className={clsx(
        'sihua-badge',
        SIHUA_BADGE[sh],
        overlay && 'border-dashed opacity-80',
        onClick && 'cursor-pointer hover:opacity-100',
      )}
      onClick={onClick}
    >
      {overlay && label && <span className="mr-px opacity-70">{label}</span>}
      {siHua}
    </span>
  );
};

/** 单颗星：星名 + 庙旺利陷角标 + 四化 badge */
function StarLine({
  star,
  baseClass,
  overlaySiHua,
  overlayLabel,
  onStarClick,
  onSiHuaClick,
}: {
  star: Star;
  baseClass: string;
  overlaySiHua?: string;
  overlayLabel?: string;
  onStarClick?: (star: Star) => void;
  onSiHuaClick?: (starName: string, siHua: string) => void;
}) {
  const raw = star.brightnessRaw as StarBrightness | undefined;
  return (
    <div className="flex items-center" onClick={e => { e.stopPropagation(); onStarClick?.(star); }}>
      <span className={clsx('leading-tight font-bold tracking-tight cursor-pointer hover:brightness-125 transition-all', baseClass)}>
        {star.name}
      </span>
      {/* 庙旺利陷角标 */}
      {raw && (
        <span
          className="text-[7px] ml-0.5 leading-none font-medium"
          style={{ color: BRIGHTNESS_COLOR[raw] }}
          title={`亮度：${raw}`}
        >
          {raw}
        </span>
      )}
      {star.siHua && <SiHuaBadge siHua={star.siHua} />}
      {overlaySiHua && (
        <SiHuaBadge
          siHua={overlaySiHua}
          overlay
          label={overlayLabel}
          onClick={e => {
            e.stopPropagation();
            onSiHuaClick?.(star.name, overlaySiHua);
          }}
        />
      )}
    </div>
  );
}

export default function PalaceCell({
  palace, onClick, onStarClick, isSelected, isSanFang, delay = 0,
  overlayStarSiHua, overlayLabel, onSiHuaClick,
}: PalaceCellProps) {
  const { branch, stem, name, stars, daXianAge, isCurrentDaXian, isMingGong, isShenGong, selfSihua, isEmpty, borrowedFromName, borrowedStars } = palace;
  const ganzhi = `${STEMS[stem]}${BRANCHES[branch]}`;

  const majorStars = stars.filter(s => s.type === 'major');
  const luckyStars = stars.filter(s => s.type === 'lucky');
  const shaStars = stars.filter(s => s.type === 'sha');
  const minorStars = stars.filter(s => s.type === 'minor');

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.35, delay, ease: 'easeOut' }}
      onClick={onClick}
      className="relative flex flex-col p-1.5 cursor-pointer transition-all duration-200 h-full"
      style={{
        minHeight: '90px',
        background: isCurrentDaXian
          ? 'rgba(147,51,234,0.08)'
          : isSelected
          ? 'rgba(37,99,235,0.18)'
          : isSanFang
          ? 'rgba(37,99,235,0.09)'
          : isMingGong
          ? 'rgba(212,168,67,0.04)'
          : 'var(--t-bg)',
        boxShadow: isCurrentDaXian
          ? 'inset 3px 0 0 rgba(147,51,234,0.5)'
          : isSelected
          ? 'inset 0 0 0 1.5px rgba(37,99,235,0.7)'
          : isSanFang
          ? 'inset 0 0 0 1px rgba(37,99,235,0.4)'
          : 'none',
      }}
    >
      {/* 大限年龄 */}
      {daXianAge && (
        <div className={clsx(
          'absolute top-1 right-1 text-[9px] font-mono tabular-nums',
          isCurrentDaXian ? 'text-purple-400' : ''
        )}
          style={!isCurrentDaXian ? { color: 'var(--t-faint)', opacity: 0.75 } : undefined}
        >
          {daXianAge[0]}–{daXianAge[1]}
        </div>
      )}

      {/* 宫名行 */}
      <div className="flex items-center gap-1 mb-0.5 pr-8">
        <span className={clsx('text-[10px] font-medium tracking-wide',
          isMingGong ? 'text-amber-500' : isShenGong ? 'text-sky-500' : ''
        )}
          style={!isMingGong && !isShenGong ? { color: 'var(--t-faint)' } : undefined}
        >
          {name}
        </span>
        {isMingGong && (
          <span className="text-[7px] text-amber-500/80 border border-amber-500/30 px-0.5 rounded leading-tight">命</span>
        )}
        {isShenGong && (
          <span className="text-[7px] text-sky-500/80 border border-sky-500/30 px-0.5 rounded leading-tight">身</span>
        )}
        {/* 宫干自化标记 */}
        {selfSihua && selfSihua.length > 0 && (
          <span
            className="sihua-badge badge-ji ml-auto"
            title={`宫干自化：${selfSihua.map(s => `${s.starName}化${s.siHua}`).join('、')}`}
          >
            自化{selfSihua[0].siHua}
          </span>
        )}
      </div>

      {/* 干支 */}
      <div className="text-[9px] font-mono mb-1" style={{ color: 'var(--t-faint)', opacity: 0.75 }}>{ganzhi}</div>

      {/* 主星（含庙旺利陷角标） */}
      <div className="flex flex-col gap-0.5 flex-1">
        {majorStars.length === 0 && !isEmpty && (
          <span className="text-[10px] italic" style={{ color: 'var(--t-faint)', opacity: 0.6 }}>空宫</span>
        )}
        {isEmpty && (
          <div className="text-[9px] leading-tight" style={{ color: 'var(--t-faint)', opacity: 0.85 }}>
            <span className="text-[8px] rounded px-0.5 mr-0.5" style={{ border: '1px solid currentColor', opacity: 0.55 }}>空</span>
            {borrowedFromName ? `借${borrowedFromName.replace('宫', '')}` : '空宫借星'}
            {borrowedStars && borrowedStars.length > 0 && (
              <span className="text-[10px] font-bold ml-1" style={{ color: 'var(--t-gold)', opacity: 0.9 }}>
                {borrowedStars.join('·')}
              </span>
            )}
          </div>
        )}
        {majorStars.map((star) => (
          <StarLine
            key={star.name}
            star={star}
            baseClass="text-[13px]"
            overlaySiHua={overlayStarSiHua?.[star.name]}
            overlayLabel={overlayLabel}
            onStarClick={onStarClick}
            onSiHuaClick={onSiHuaClick}
          />
        ))}
      </div>

      {/* 吉星 */}
      {luckyStars.length > 0 && (
        <div className="flex flex-wrap gap-x-1 mt-0.5">
          {luckyStars.map(s => (
            <StarLine
              key={s.name}
              star={s}
              baseClass="text-[9px]"
              overlaySiHua={overlayStarSiHua?.[s.name]}
              overlayLabel={overlayLabel}
              onStarClick={onStarClick}
              onSiHuaClick={onSiHuaClick}
            />
          ))}
        </div>
      )}

      {/* 煞星 */}
      {shaStars.length > 0 && (
        <div className="flex flex-wrap gap-x-1">
          {shaStars.map(s => (
            <StarLine
              key={s.name}
              star={s}
              baseClass="text-[9px]"
              overlaySiHua={overlayStarSiHua?.[s.name]}
              overlayLabel={overlayLabel}
              onStarClick={onStarClick}
              onSiHuaClick={onSiHuaClick}
            />
          ))}
        </div>
      )}

      {/* 辅星 / 杂曜 / 神煞（minor） */}
      {minorStars.length > 0 && (
        <div className="flex flex-wrap gap-x-1 gap-y-0.5 mt-0.5 pt-0.5" style={{ borderTop: '1px solid var(--t-border)', opacity: 0.78 }}>
          {minorStars.map(s => (
            <span key={s.name} className="text-[8px] leading-none" style={{ color: 'var(--t-faint)' }}>
              {s.name}
            </span>
          ))}
        </div>
      )}
    </motion.div>
  );
}
