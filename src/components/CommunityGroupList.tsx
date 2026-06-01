import React, { useState } from 'react';
import { Users, Plus, Search, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Group {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  image?: string;
  isJoined: boolean;
  category?: string;
  privacy: 'public' | 'private';
}

const CommunityGroupList: React.FC<{
  joinedGroups?: Group[];
  availableGroups?: Group[];
  onGroupClick?: (id: string) => void;
}> = ({ joinedGroups = [], availableGroups = [], onGroupClick }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const { t } = useTranslation();

  return (
    <div className="w-full max-w-3xl mx-auto bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-6">{t('community.communityGroups')}</h2>
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder={t('community.searchGroups')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border rounded-lg"
        />
      </div>
      <div className="space-y-4">
        {joinedGroups.map((group) => (
          <div
            key={group.id}
            onClick={() => onGroupClick?.(group.id)}
            className="border rounded-lg p-4 hover:shadow-md transition cursor-pointer"
          >
            <div className="flex gap-4">
              <div className="w-16 h-16 rounded-lg flex items-center justify-center" style={{ background: "#6B3FBF" }}>
                <Users size={24} className="text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-1">{group.name}</h3>
                <p className="text-gray-600 text-sm">{group.description}</p>
                <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
                  <Users size={14} />
                  <span>{group.memberCount} {t('community.membersCount')}</span>
                </div>
              </div>
              <ChevronRight size={20} className="text-gray-400" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CommunityGroupList;
