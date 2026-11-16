import { FREE_HOSTING } from '@/config/free-hosting';

if (FREE_HOSTING) {
  const style = document.createElement('style');
  style.textContent = '.pro-banner-slot,#missionPresetMount{display:none!important}';
  document.head.append(style);
  const notice = document.createElement('aside');
  notice.id = 'free-hosting-notice';
  notice.setAttribute('aria-label', '免费部署数据说明');
  notice.style.cssText = 'position:fixed;bottom:0;left:0;right:0;z-index:10000;padding:8px 12px;background:#172332;color:#fff;font-size:12px;line-height:1.5;border-top:1px solid #4b657a;';
  const status = document.createElement('span');
  status.textContent = '免费静态版 · 新闻为部署快照，刷新网页不会更新源数据 · 地震为 USGS 公开数据 · AI、行情、航班及后台实时面板不可用。';
  const source = document.createElement('a');
  source.href = 'https://github.com/ChellyRyo/worldmonitor/tree/codex/vercel-free';
  source.textContent = ' 源码（AGPL）';
  source.style.color = '#80c8ff';
  notice.append(status, source);
  document.body.append(notice);
  void fetch('/free-data/manifest.json', { cache: 'no-store' }).then(async response => {
    if (!response.ok) throw new Error('Snapshot metadata unavailable');
    const manifest = await response.json();
    const date = new Date(manifest.generatedAt);
    if (!Number.isFinite(date.getTime())) throw new Error('Invalid snapshot timestamp');
    status.textContent += ` 新闻快照：${date.toLocaleString()}（${manifest.available}/${manifest.total} 个源可用）；重新部署可更新。`;
  }).catch(() => { status.textContent += ' 新闻快照时间无法读取。'; });
}

