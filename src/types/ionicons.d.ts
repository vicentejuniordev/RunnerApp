// Compatibility declarations for the missing types in the installed Ionicons package.
// Keep this limited to the API used by the application.
declare module 'ionicons' {
  export function addIcons(icons: Record<string, string>): void;
}

declare module 'ionicons/icons' {
  export const homeOutline: string;
  export const trailSignOutline: string;
  export const footstepsOutline: string;
  export const personCircleOutline: string;
  export const menuOutline: string;
  export const notificationsOutline: string;
}
