import { useEffect } from 'react';
import { Modal, Form, Input, Radio, Select, Button, Tooltip } from 'antd';
import Icon from '../icons/Icon';
import { useOpenBridgeModal, useBridgeNamespace } from '../../hooks/useLingeeBridge';

/* 会话页/首页"关联应用"下拉里的"新建应用"子弹窗，见
   docs/react-migration-plan.md Phase 2b、src/scripts/main.js 里的
   _newAppBridge/confirmNewApp。"选择应用"字段原来是一套手写的搜索浮层
   （sourceAppMenu），这里直接用 antd Select 的内置搜索替掉，不再自己拼一份。
   注意：这里的应用列表来自 fullAppData（会话页关联应用的全量台账），跟应用
   开发页的 APPS_LIBRARY 是两个不同数据源，见方案 §8.9，不能混用——本组件
   全程只通过 bridge.getAppOptions() 读 fullAppData 那一份。 */
export default function NewAppModal() {
  const openModal = useOpenBridgeModal('newApp');
  const bridge = useBridgeNamespace('newApp');
  const [form] = Form.useForm();
  const open = openModal === 'newapp';
  const createType = Form.useWatch('type', form);

  useEffect(() => {
    if (open) {
      form.resetFields();
      form.setFieldsValue({ type: 'new', name: '', sourceApp: undefined });
    }
  }, [open, form]);

  if (!bridge) return null;

  function close() {
    bridge.close();
  }

  async function submit() {
    try {
      const values = await form.validateFields();
      bridge.confirm({ type: values.type, name: values.name, sourceApp: values.sourceApp });
      // confirm 校验不通过时只 toast、不关弹窗；这里不主动 close，交给 main.js
      // 的 confirmNewApp 在真正成功时调用 closeNewAppModal()。
    } catch {
      /* antd Form 校验错误已经展示在字段旁 */
    }
  }

  const appOptions = (bridge.getAppOptions() || []).map((o) => ({
    value: o.value,
    label: `${o.label}（${o.cloud}）`,
  }));

  return (
    <Modal
      title={
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon name="app-window" size={18} color="var(--brand)" />
          新建应用
        </span>
      }
      open={open}
      onCancel={close}
      width={480}
      rootClassName="cv-modal-scope"
      footer={[
        <Button key="cancel" onClick={close}>
          取消
        </Button>,
        <Button key="confirm" type="primary" onClick={submit}>
          确认
        </Button>,
      ]}
      afterOpenChange={(isOpen) => {
        if (isOpen) form.getFieldInstance('name')?.focus();
      }}
    >
      <Form form={form} layout="vertical" initialValues={{ type: 'new' }}>
        <Form.Item
          label={
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              创建类型
              <Tooltip
                title={
                  <div style={{ lineHeight: 1.7 }}>
                    <div>
                      <b>新建</b>：从零创建，无任何关联
                    </div>
                    <div>
                      <b>扩展</b>：改造原应用，一处改处处生效，不可新建表
                    </div>
                    <div>
                      <b>继承</b>：派生独立新应用，各继承单互不干扰，可新建表
                    </div>
                  </div>
                }
              >
                <span style={{ display: 'inline-flex', color: 'var(--text-soft)', cursor: 'help' }}>
                  <Icon name="info" size={14} />
                </span>
              </Tooltip>
            </span>
          }
          name="type"
        >
          <Radio.Group
            options={[
              { value: 'new', label: '新建' },
              { value: 'extend', label: '扩展新建' },
              { value: 'inherit', label: '继承新建' },
            ]}
            optionType="button"
          />
        </Form.Item>
        {(createType === 'extend' || createType === 'inherit') && (
          <Form.Item
            label="选择应用"
            name="sourceApp"
            rules={[{ required: true, message: '请选择已有应用' }]}
          >
            <Select
              showSearch
              placeholder="搜索应用"
              options={appOptions}
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              onChange={(value) => form.setFieldsValue({ name: value })}
            />
          </Form.Item>
        )}
        <Form.Item label="应用名称" name="name" rules={[{ required: true, message: '请输入应用名称' }]}>
          <Input placeholder="请输入应用名称" autoFocus />
        </Form.Item>
      </Form>
    </Modal>
  );
}
