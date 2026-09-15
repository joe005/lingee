import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ExpertModals from './ExpertModals';

/* ExpertModals 冒烟测试（见 docs/react-migration-plan.md §8.8）。
   不追求覆盖率，只保证关键路径不崩：弹窗打开时渲染内容、按钮点击调用
   bridge 方法。bridge 通过 src/test/setup.js 全局 mock。 */

describe('ExpertModals', () => {
  beforeEach(() => {
    // 重置 bridge 的 open 状态
    window.__lingeeBridge.expert.getOpenModal = () => null;
    window.__lingeeBridge.expertEdit.getOpenModal = () => null;
    window.__lingeeBridge.team.getOpenModal = () => null;
    window.__lingeeBridge.member.getOpenModal = () => null;
  });

  describe('ExpertDetailModal', () => {
    it('打开时渲染专家名称和职称', () => {
      window.__lingeeBridge.expert.getOpenModal = () => 'expert-detail';
      render(<ExpertModals />);
      expect(screen.getByText('测试专家')).toBeInTheDocument();
      expect(screen.getByText(/测试角色/)).toBeInTheDocument();
    });

    it('未打开时不渲染专家详情', () => {
      render(<ExpertModals />);
      expect(screen.queryByText('测试专家')).not.toBeInTheDocument();
    });

    it('点击"编辑"按钮调用 bridge.expert.editExpert', () => {
      const editExpert = vi.fn();
      window.__lingeeBridge.expert.editExpert = editExpert;
      window.__lingeeBridge.expert.getOpenModal = () => 'expert-detail';
      render(<ExpertModals />);
      // antd Button 会在中文之间加空格（"编 辑"），用正则匹配
      fireEvent.click(screen.getByText(/编.*辑/));
      expect(editExpert).toHaveBeenCalledWith('test-expert');
    });

    it('点击"召唤专家"按钮调用 bridge.expert.callExpert', () => {
      const callExpert = vi.fn();
      window.__lingeeBridge.expert.callExpert = callExpert;
      window.__lingeeBridge.expert.getOpenModal = () => 'expert-detail';
      render(<ExpertModals />);
      fireEvent.click(screen.getByText(/召唤专家/));
      expect(callExpert).toHaveBeenCalledWith('test-expert');
    });
  });

  describe('MemberPickerModal', () => {
    it('打开时渲染专家列表', () => {
      window.__lingeeBridge.member.getOpenModal = () => 'member-picker';
      render(<ExpertModals />);
      expect(screen.getByText('软件工程师')).toBeInTheDocument();
      expect(screen.getByText('测试工程师')).toBeInTheDocument();
    });

    it('点击成员调用 bridge.member.toggleMember', () => {
      const toggleMember = vi.fn();
      window.__lingeeBridge.member.toggleMember = toggleMember;
      window.__lingeeBridge.member.getOpenModal = () => 'member-picker';
      render(<ExpertModals />);
      fireEvent.click(screen.getByText('软件工程师'));
      expect(toggleMember).toHaveBeenCalledWith('eng');
    });

    it('已加入的成员显示"已加入"标记', () => {
      window.__lingeeBridge.member.getOpenModal = () => 'member-picker';
      render(<ExpertModals />);
      expect(screen.getByText('已加入')).toBeInTheDocument();
    });
  });

  describe('TeamConfigModal', () => {
    it('打开时渲染成员列表', () => {
      window.__lingeeBridge.team.getOpenModal = () => 'team-config';
      render(<ExpertModals />);
      expect(screen.getByText('软件工程师')).toBeInTheDocument();
    });

    it('点击"添加成员"调用 bridge.team.openMemberPicker', () => {
      const openMemberPicker = vi.fn();
      window.__lingeeBridge.team.openMemberPicker = openMemberPicker;
      window.__lingeeBridge.team.getOpenModal = () => 'team-config';
      render(<ExpertModals />);
      fireEvent.click(screen.getByText(/添加成员/));
      expect(openMemberPicker).toHaveBeenCalled();
    });
  });

  describe('ExpertEditModal', () => {
    it('打开时渲染头像选择器和工作模式', () => {
      window.__lingeeBridge.expertEdit.getOpenModal = () => 'expert-edit';
      render(<ExpertModals />);
      // antd Modal 通过 portal 挂到 document.body，不能用 container 查询
      const avatars = document.body.querySelectorAll('.x-av-opt');
      expect(avatars.length).toBe(4);
      const modes = document.body.querySelectorAll('.x-mode-opt');
      expect(modes.length).toBe(7);
    });
  });
});
