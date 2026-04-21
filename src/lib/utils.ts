import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface OperatingHours {
  [day: string]: {
    open: string;
    close: string;
    isClosed: boolean;
  }
}

export function isStoreCurrentlyOpen(operatingHours?: OperatingHours, manualIsOpen?: boolean): boolean {
  if (manualIsOpen === false) return false; // Store owner manually closed it
  if (!operatingHours) return manualIsOpen !== false; // Fallback to manual toggle if no hours set

  const now = new Date();
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const currentDay = days[now.getDay()];
  
  const todayHours = operatingHours[currentDay];
  if (!todayHours || todayHours.isClosed) return false;

  const currentTime = now.getHours() * 60 + now.getMinutes();
  
  const [openHour, openMinute] = todayHours.open.split(':').map(Number);
  const openTime = openHour * 60 + openMinute;
  
  const [closeHour, closeMinute] = todayHours.close.split(':').map(Number);
  const closeTime = closeHour * 60 + closeMinute;

  return currentTime >= openTime && currentTime <= closeTime;
}

export function getTodayOperatingHours(operatingHours?: OperatingHours): string {
  if (!operatingHours) return 'Hours not available';
  
  const now = new Date();
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const currentDay = days[now.getDay()];
  
  const todayHours = operatingHours[currentDay];
  if (!todayHours || todayHours.isClosed) return 'Closed today';
  
  // Convert 24h to 12h format
  const formatTime = (timeStr: string) => {
    const [h, m] = timeStr.split(':');
    const hour = parseInt(h);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${m} ${ampm}`;
  };
  
  return `${formatTime(todayHours.open)} - ${formatTime(todayHours.close)}`;
}
