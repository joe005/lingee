import { Button, Input, Select, Modal, Tag, Switch, Slider, Tabs, Radio, Card, Typography, Row, Col, Divider } from 'antd';
import Icon from '../components/icons/Icon';

const { Title, Paragraph, Text } = Typography;

/* Design System 目录页（Phase 3）。
   按 §8.5 方案 1 降级为"主题预览页"：用 antd 真实组件 + 定制过的主题 token
   渲染一遍，纯粹给团队看"我们的 antd 主题长什么样"。原来的 37+ 组件 demo
   和 43 个占位组件的手写实现全部删除——antd 官方文档已经是权威的组件说明。 */
export default function DesignView() {
  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '32px 24px' }}>
      <Title level={2}>Lingee 组件主题预览</Title>
      <Paragraph type="secondary">
        基于 Ant Design 5 定制主题。以下展示核心组件在当前主题下的实际效果。
        组件完整文档见 <a href="https://ant.design/components/overview-cn" target="_blank" rel="noreferrer">antd 官方文档</a>。
      </Paragraph>

      <Divider>基础组件</Divider>
      <Row gutter={[16, 16]}>
        <Col span={8}>
          <Card size="small" title="Button">
            <Space>
              <Button type="primary">主要按钮</Button>
              <Button>默认</Button>
              <Button type="dashed">虚线</Button>
              <Button type="link">链接</Button>
            </Space>
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small" title="Tag">
            <Space>
              <Tag color="blue">标签</Tag>
              <Tag color="green">成功</Tag>
              <Tag color="orange">警告</Tag>
              <Tag color="red">错误</Tag>
            </Space>
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small" title="Switch & Slider">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Switch defaultChecked />
              <Slider defaultValue={30} />
            </div>
          </Card>
        </Col>
      </Row>

      <Divider>表单组件</Divider>
      <Row gutter={[16, 16]}>
        <Col span={8}>
          <Card size="small" title="Input">
            <Input placeholder="请输入" />
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small" title="Select">
            <Select defaultValue="" style={{ width: '100%' }} options={[{ value: '', label: '请选择' }, { value: 'a', label: '选项 A' }, { value: 'b', label: '选项 B' }]} />
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small" title="Radio">
            <Radio.Group defaultValue="a">
              <Radio value="a">A</Radio>
              <Radio value="b">B</Radio>
            </Radio.Group>
          </Card>
        </Col>
      </Row>

      <Divider>布局 & 导航</Divider>
      <Card size="small" title="Tabs">
        <Tabs items={[
          { key: '1', label: '页签 1', children: <Text>页签 1 内容</Text> },
          { key: '2', label: '页签 2', children: <Text>页签 2 内容</Text> },
        ]} />
      </Card>

      <Divider>反馈</Divider>
      <Row gutter={[16, 16]}>
        <Col span={12}>
          <Card size="small" title="Modal 触发">
            <Button onClick={() => Modal.info({ title: '示例弹窗', content: '这是 antd Modal 在当前主题下的效果。' })}>
              打开 Modal
            </Button>
          </Card>
        </Col>
        <Col span={12}>
          <Card size="small" title="Card 本身">
            <Text>这个 Card 就是 antd Card 组件在当前主题下的效果。</Text>
          </Card>
        </Col>
      </Row>

      <Divider />
      <Paragraph type="secondary" style={{ textAlign: 'center', fontSize: 13 }}>
        <Icon name="info" size={14} /> 主题 token 配置见 <code>src/theme/antd-theme.js</code>，设计令牌见 <code>src/styles/tokens.css</code>。
      </Paragraph>
    </div>
  );
}

/* 简易 Space（antd 的 Space 可能未导入） */
function Space({ children }) {
  return <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>{children}</div>;
}
