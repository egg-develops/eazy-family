import { NavLink, useLocation } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { 
  Calendar, 
  MapPin, 
  Camera, 
  Users, 
  Settings, 
  Home,
  CheckSquare
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

export function AppSidebar() {
  const { t } = useTranslation()
  const { state, setOpen } = useSidebar()
  const location = useLocation()
  const currentPath = location.pathname
  const collapsed = state === "collapsed"

  const navigationItems = [
    { id: "home", label: t('nav.home'), icon: Home, path: "/app" },
    { id: "calendar", label: t('nav.calendar'), icon: Calendar, path: "/app/calendar" },
    { id: "todos", label: "To-Do's", icon: CheckSquare, path: "/app/todos" },
    { id: "events", label: t('nav.events'), icon: MapPin, path: "/app/events" },
    { id: "memories", label: t('nav.memories'), icon: Camera, path: "/app/memories" },
    { id: "community", label: t('nav.community'), icon: Users, path: "/app/community" },
    { id: "settings", label: t('nav.settings'), icon: Settings, path: "/app/settings" },
  ]

  const isActive = (path: string) => currentPath === path
  const getNavCls = (isActive: boolean) =>
    isActive 
      ? "bg-primary text-primary-foreground font-semibold shadow-custom-md scale-105" 
      : "hover:bg-muted/50 hover:scale-102 transition-all duration-200"

  return (
    <Sidebar className={`${collapsed ? "w-12" : "w-48"} pt-16 hidden md:flex`} collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
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
                        className={`${getNavCls(isActive(item.path))} transition-all duration-300`}
                        onClick={() => !collapsed && setOpen(false)}
                      >
                        <Icon className={`h-4 w-4 ${collapsed ? "" : "mr-2"} ${isActive(item.path) ? "animate-pulse" : ""}`} />
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