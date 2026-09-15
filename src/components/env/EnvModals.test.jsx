import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import EnvModals from './EnvModals';

/* EnvModals 冒烟测试（见 docs/react-migration-plan.md §8.8）。
   bridge 通过 src/test/setup.js 全局 mock。 */

describe('EnvModals', () => {
  beforeEach(() => {
    window.__lingeeBridge.env.getOpenModal = () => null;
    window.__lingeeBridge.envAuthorize.getOpenModal = () => null;
    window.__lingeeBridge.consent.getOpenModal = () => null;
    window.__lingeeBridge.envDisconnect.getOpenModal = () => null;
    window.__lingeeBridge.envAuthConfirm.getOpenModal = () => null;
  });

  describe('EnvDisconnectModal', () => {
    it('打开时渲染环境名', () => {
      window.__lingeeBridge.envDisconnect.getOpenModal = () => 'env-disconnect';
      render(<EnvModals />);
      expect(screen.getByText(/测试环境/)).toBeInTheDocument();
    });

    it('点击"断开连接"调用 bridge.envDisconnect.confirm', () => {
      const confirm = vi.fn();
      window.__lingeeBridge.envDisconnect.confirm = confirm;
      window.__lingeeBridge.envDisconnect.getOpenModal = () => 'env-disconnect';
      render(<EnvModals />);
      // 标题和按钮都含"断开连接"，用 button role 精确匹配
      fireEvent.click(screen.getByRole('button', { name: /断开连接/ }));
      expect(confirm).toHaveBeenCalled();
    });
  });

  describe('EnvAuthConfirmModal', () => {
    it('打开时渲染确认文案', () => {
      window.__lingeeBridge.envAuthConfirm.getOpenModal = () => 'env-auth-confirm';
      render(<EnvModals />);
      expect(screen.getByText(/切换为普通 AccessToken 认证/)).toBeInTheDocument();
    });

    it('点击"确认启用"调用 bridge.envAuthConfirm.confirm', () => {
      const confirm = vi.fn();
      window.__lingeeBridge.envAuthConfirm.confirm = confirm;
      window.__lingeeBridge.envAuthConfirm.getOpenModal = () => 'env-auth-confirm';
      render(<EnvModals />);
      fireEvent.click(screen.getByText(/确认启用/));
      expect(confirm).toHaveBeenCalled();
    });
  });

  describe('EnvAuthorizeModal', () => {
    it('打开时渲染等待状态', () => {
      window.__lingeeBridge.envAuthorize.getOpenModal = () => 'env-authorize';
      render(<EnvModals />);
      expect(screen.getByText(/已在浏览器中打开授权页面/)).toBeInTheDocument();
    });
  });

  describe('EnvConfigModal', () => {
    it('打开时渲染表单字段', () => {
      window.__lingeeBridge.env.getOpenModal = () => 'env-config';
      render(<EnvModals />);
      expect(screen.getByText('环境名')).toBeInTheDocument();
      expect(screen.getByText('环境类型')).toBeInTheDocument();
      expect(screen.getByText('环境地址')).toBeInTheDocument();
    });

    it('打开时渲染授权类型选择', () => {
      window.__lingeeBridge.env.getOpenModal = () => 'env-config';
      render(<EnvModals />);
      expect(screen.getByText('OAuth 授权')).toBeInTheDocument();
      expect(screen.getByText('第三方应用')).toBeInTheDocument();
    });
  });
});
