import { NavLink, useLocation } from "react-router-dom"
import { 
  Calendar, 
  MapPin, 
  Camera, 
  Users, 
  ShoppingCart, 
  Settings, 
  Home
} from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"

const navigationItems = [
  { id: "home", label: "Home", icon: Home, path: "/app" },
  { id: "calendar", label: "Calendar", icon: Calendar, path: "/app/calendar" },
  { id: "events", label: "Events", icon: MapPin, path: "/app/events" },
  { id: "photos", label: "Photos", icon: Camera, path: "/app/photos" },
  { id: "community", label: "Community", icon: Users, path: "/app/community" },
  { id: "marketplace", label: "Market", icon: ShoppingCart, path: "/app/marketplace" },
  { id: "settings", label: "Settings", icon: Settings, path: "/app/settings" },
]

export function AppSidebar() {
  const { state } = useSidebar()
  const location = useLocation()
  const currentPath = location.pathname
  const collapsed = state === "collapsed"

  const isActive = (path: string) => currentPath === path
  const getNavCls = (isActive: boolean) =>
    isActive ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted/50"

  return (
    <Sidebar className={collapsed ? "w-14" : "w-64"} collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Eazy.Family</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => {
                const Icon = item.icon
                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton asChild>
                      <NavLink 
                        to={item.path} 
                        end 
                        className={getNavCls(isActive(item.path))}
                      >
                        <Icon className="mr-2 h-4 w-4" />
                        {!collapsed && <span>{item.label}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}