/**
 * 图片托管脚本 — 入口文件
 *
 * 为角色卡创作者提供本地图片上传、管理、导出/导入功能
 * 其他脚本/前端界面可通过 `await waitGlobalInitialized('ImageHosting')` 获取 API
 */

import './管理界面';
import { registerGlobalAPI } from './global-api';
import { reloadOnChatChange } from '@util/script';

// 加载时注册全局 API 和聊天变更监听
$(() => {
    registerGlobalAPI();
    reloadOnChatChange();

    console.info('[图片托管] 脚本已加载');
});
