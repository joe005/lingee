import trashIcon from '../../assets/figma/task-list/trash.svg?raw';

/* 系统删除入口共用视觉稿图形，颜色继承入口文字。 */
export const DELETE_ICON = trashIcon
  .replaceAll('fill="black" fill-opacity="0.64"', 'fill="currentColor"')
  .replace('style="display: block;"', '')
  .replace('<svg ', '<svg aria-hidden="true" ');
