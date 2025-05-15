import React, { useState } from 'react';
import { Layout, Typography, Modal, Tabs } from 'antd';
import { AppstoreOutlined, PlusOutlined } from '@ant-design/icons';
import AppLayout from '../components/AppLayout';
import PageTransition from '../components/PageTransition';
import AdminAmenitiesTable from '../components/AdminAmenitiesTable';
import AmenityForm from '../components/AmenityForm';
import { Amenity } from '../utils/types';

const { Content } = Layout;
const { Title } = Typography;
const { TabPane } = Tabs;

const AmenityManagement: React.FC = () => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [currentAmenity, setCurrentAmenity] = useState<Partial<Amenity> | undefined>(undefined);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  const handleAddAmenity = () => {
    setCurrentAmenity(undefined);
    setIsEditing(false);
    setIsModalVisible(true);
  };

  const handleEditAmenity = (amenity: Amenity) => {
    setCurrentAmenity(amenity);
    setIsEditing(true);
    setIsModalVisible(true);
  };

  const handleModalCancel = () => {
    setIsModalVisible(false);
  };

  const handleFormSuccess = () => {
    setIsModalVisible(false);
    // Refresh amenities table - the component will handle this internally
  };

  return (
    <AppLayout userRole="admin">
      <PageTransition>
        <Content className="p-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
              <AppstoreOutlined className="text-2xl text-[#D4AF37]" />
              <Title level={3} className="m-0">Amenity Management</Title>
            </div>
            
            <Tabs defaultActiveKey="all" onChange={setActiveTab} className="mb-6">
              <TabPane tab="All Amenities" key="all" />
              <TabPane tab="By Category" key="category" />
            </Tabs>

            {activeTab === 'all' && (
              <AdminAmenitiesTable 
                onEdit={handleEditAmenity}
                onAdd={handleAddAmenity}
              />
            )}

            {activeTab === 'category' && (
              <div className="text-center py-10">
                <Title level={5}>Category view coming soon...</Title>
              </div>
            )}

            <Modal
              title={isEditing ? "Edit Amenity" : "Add New Amenity"}
              open={isModalVisible}
              onCancel={handleModalCancel}
              footer={null}
              width={600}
              destroyOnClose
            >
              <AmenityForm
                initialValues={currentAmenity}
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

export default AmenityManagement; 