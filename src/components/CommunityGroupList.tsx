import { Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Group {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  category: string;
  isJoined: boolean;
}

interface Props {
  groups: Group[];
  onJoinGroup: (id: string) => void;
  onViewGroup: (id: string) => void;
}

const CommunityGroupList = ({ groups, onJoinGroup, onViewGroup }: Props) => {
  if (groups.length === 0) {
    return (
      <Card className="shadow-custom-md">
        <CardContent className="p-8 text-center">
          <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-medium mb-2">No groups available</h3>
          <p className="text-sm text-muted-foreground">Groups will appear here when they're created</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3" role="list" aria-label="Community groups">
      {groups.map((group) => (
        <Card key={group.id} className="shadow-custom-md" role="listitem">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold">{group.name}</h4>
                <p className="text-sm text-muted-foreground truncate">{group.description}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="secondary" className="text-xs">
                    {group.memberCount} members
                  </Badge>
                  <Badge variant="outline" className="text-xs">{group.category}</Badge>
                </div>
              </div>
              {group.isJoined ? (
                <Button variant="outline" size="sm" onClick={() => onViewGroup(group.id)}>View</Button>
              ) : (
                <Button size="sm" className="bg-primary text-primary-foreground" onClick={() => onJoinGroup(group.id)}>Join</Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default CommunityGroupList;
