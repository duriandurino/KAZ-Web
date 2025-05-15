import React, { useState } from 'react';
import { Layout, Typography, Modal, Tabs } from 'antd';
import { CustomerServiceOutlined, PlusOutlined } from '@ant-design/icons';
import AppLayout from '../components/AppLayout';
import PageTransition from '../components/PageTransition';
import AdminServicesTable from '../components/AdminServicesTable';
import ServiceForm from '../components/ServiceForm';
import { Service } from '../utils/types';

const { Content } = Layout;
const { Title } = Typography;
const { TabPane } = Tabs;

const ServiceManagement: React.FC = () => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [currentService, setCurrentService] = useState<Partial<Service> | undefined>(undefined);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  const handleAddService = () => {
    setCurrentService(undefined);
    setIsEditing(false);
    setIsModalVisible(true);
  };

  const handleEditService = (service: Service) => {
    setCurrentService(service);
    setIsEditing(true);
    setIsModalVisible(true);
  };

  const handleModalCancel = () => {
    setIsModalVisible(false);
  };

  const handleFormSuccess = () => {
    setIsModalVisible(false);
    // Refresh services table - the component will handle this internally
  };

  return (
    <AppLayout userRole="admin">
      <PageTransition>
        <Content className="p-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
              <CustomerServiceOutlined className="text-2xl text-[#D4AF37]" />
              <Title level={3} className="m-0">Service Management</Title>
            </div>
            
            <Tabs defaultActiveKey="all" onChange={setActiveTab} className="mb-6">
              <TabPane tab="All Services" key="all" />
              <TabPane tab="By Category" key="category" />
              <TabPane tab="Service Analytics" key="analytics" />
            </Tabs>

            {activeTab === 'all' && (
              <AdminServicesTable 
                onEdit={handleEditService}
                onAdd={handleAddService}
              />
            )}

            {activeTab === 'category' && (
              <div className="text-center py-10">
                <Title level={5}>Category view coming soon...</Title>
              </div>
            )}

            {activeTab === 'analytics' && (
              <div className="text-center py-10">
                <Title level={5}>Service analytics coming soon...</Title>
              </div>
            )}

            <Modal
              title={isEditing ? "Edit Service" : "Add New Service"}
              open={isModalVisible}
              onCancel={handleModalCancel}
              footer={null}
              width={600}
              destroyOnClose
            >
              <ServiceForm
                initialValues={currentService}
                onSuccess={handleFormSuccess}
                onCancel={handleModalCancel}
                isEditing={isEditing}
              />
            </Modal>
          </div>
        </Content>
      </PageTransition>
    </AppLayout>
  );
};

export default ServiceManagement; 