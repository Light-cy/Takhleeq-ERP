import React from 'react';

export const formatKeyName = (key: string): string => {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .replace(/_/g, ' ')
    .trim();
};

export const formatValueFriendly = (key: string, val: any): string => {
  if (val === null || val === undefined) return 'None';
  if (Array.isArray(val)) {
    return val.length === 0 ? 'None' : val.join(', ');
  }
  if (typeof val === 'boolean') {
    return val ? 'Yes' : 'No';
  }
  
  const valStr = String(val);
  
  // Detect dates or timestamp fields
  if (typeof val === 'string' && (key.toLowerCase().includes('date') || key.toLowerCase().includes('time')) && val.includes('-')) {
    try {
      const d = new Date(val);
      if (!isNaN(d.getTime()) && val.length > 10) {
        const pad = (n: number) => String(n).padStart(2, '0');
        const year = d.getFullYear();
        const month = pad(d.getMonth() + 1);
        const day = pad(d.getDate());
        let hours = d.getHours();
        const minutes = pad(d.getMinutes());
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12;
        return `${year}-${month}-${day} ${pad(hours)}:${minutes} ${ampm}`;
      }
    } catch {}
  }
  
  return valStr;
};

export const getObjectSummary = (obj: any): string => {
  if (!obj) return '-';
  
  // 1. Detect if it's a Booking object
  if ('room' in obj || 'date' in obj || 'startTime' in obj) {
    const room = obj.room || obj.roomName || 'N/A';
    const date = obj.date ? formatValueFriendly('date', obj.date) : 'N/A';
    const time = (obj.startTime && obj.endTime) ? `${obj.startTime} - ${obj.endTime}` : 'N/A';
    const name = obj.name || obj.requesterName || 'N/A';
    const status = obj.status || 'PENDING';
    return `Booking [Room: ${room} | Date: ${date} | Time: ${time} | Requester: ${name} | Status: ${status}]`;
  }
  
  // 2. Detect if it's a Role object
  if ('permissions' in obj && ('name' in obj || 'roleName' in obj)) {
    const name = obj.name || obj.roleName || 'N/A';
    const desc = obj.description ? ` (${obj.description})` : '';
    const perms = Array.isArray(obj.permissions) ? obj.permissions.join(', ') : 'None';
    return `Role: ${name}${desc} | Permissions: [${perms}]`;
  }
  
  // 3. Detect if it's a Ban record
  if ('ban_duration' in obj || 'banDuration' in obj || 'banDurationCeiling' in obj || 'lifted_at' in obj) {
    const target = obj.email || obj.user_id || 'User';
    const duration = obj.duration || obj.ban_duration || obj.banDuration || 'N/A';
    const reason = obj.reason || obj.ban_reason || 'N/A';
    return `Ban Record [Target: ${target} | Duration: ${duration} | Reason: ${reason}]`;
  }

  // 4. Detect if it's a User record
  if ('email' in obj && ('full_name' in obj || 'fullName' in obj || 'role' in obj)) {
    const name = obj.full_name || obj.fullName || obj.name || 'N/A';
    const email = obj.email || 'N/A';
    const role = obj.role || 'N/A';
    return `User Account [Name: ${name} | Email: ${email} | Role: ${role}]`;
  }
  
  // General fallback: format only non-noise keys in a single line
  const noiseKeys = ['id', 'createdAt', 'updatedAt', 'created_at', 'updated_at', 'microsoft_id', 'microsoftId'];
  return Object.entries(obj)
    .filter(([key]) => !noiseKeys.includes(key))
    .map(([key, val]) => `${formatKeyName(key)}: ${formatValueFriendly(key, val)}`)
    .join(' | ');
};

export const formatObjectCompact = (obj: any, peer: any): string => {
  if (!obj) return '-';
  
  // If peer exists and is an object, compute a beautiful diff
  if (peer && typeof peer === 'object' && !Array.isArray(peer)) {
    const allKeys = Array.from(new Set([...Object.keys(obj), ...Object.keys(peer)]));
    const diffs: { key: string; val: any }[] = [];
    const noiseKeys = ['id', 'createdAt', 'updatedAt', 'created_at', 'updated_at', 'microsoft_id', 'microsoftId'];
    
    for (const key of allKeys) {
      if (noiseKeys.includes(key)) continue;
      const val1 = obj[key];
      const val2 = peer[key];
      
      if (JSON.stringify(val1) !== JSON.stringify(val2)) {
        diffs.push({ key, val: val1 });
      }
    }
    
    if (diffs.length > 0) {
      return diffs.map(({ key, val }) => `${formatKeyName(key)}: ${formatValueFriendly(key, val)}`).join(' | ');
    } else {
      return getObjectSummary(obj);
    }
  }
  
  return getObjectSummary(obj);
};

export const formatAuditValue = (
  valueStr: string | null | undefined,
  peerStr?: string | null | undefined
): string => {
  if (!valueStr || valueStr === '-') return '-';
  try {
    const trimmed = valueStr.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === 'object') {
        if (Array.isArray(parsed)) {
          if (parsed.length === 0) return 'None';
          return parsed.map(item => {
            if (typeof item === 'object' && item !== null) {
              return formatObjectCompact(item, null);
            }
            return String(item);
          }).join(', ');
        }
        
        let peerObj: any = null;
        if (peerStr && peerStr !== '-') {
          try {
            const peerTrimmed = peerStr.trim();
            if (peerTrimmed.startsWith('{')) {
              peerObj = JSON.parse(peerTrimmed);
            }
          } catch {}
        }
        
        return formatObjectCompact(parsed, peerObj);
      }
    }
  } catch (e) {
    // Return original string if parse fails
  }
  return valueStr;
};

export const renderAuditValue = (valueStr: string | null | undefined, peerStr?: string | null | undefined) => {
  if (!valueStr || valueStr === '-') return <span className="text-gray-300">-</span>;
  
  const formatted = formatAuditValue(valueStr, peerStr);
  if (formatted === '-') return <span className="text-gray-300">-</span>;
  
  // Split key-value pairs separated by '|' and display them as beautiful tags or list items
  if (formatted.includes(' | ')) {
    const parts = formatted.split(' | ');
    return (
      <div className="flex flex-col gap-0.5 max-w-xs">
        {parts.map((part, idx) => {
          const colonIdx = part.indexOf(':');
          if (colonIdx !== -1) {
            const k = part.substring(0, colonIdx).trim();
            const v = part.substring(colonIdx + 1).trim();
            return (
              <div key={idx} className="text-[10.5px] leading-normal flex items-start gap-1">
                <span className="font-bold text-gray-500 whitespace-nowrap">{k}:</span>
                <span className="text-gray-850 break-words font-medium">{v}</span>
              </div>
            );
          }
          return <span key={idx} className="text-gray-700 font-medium break-words">{part}</span>;
        })}
      </div>
    );
  }
  
  return <span className="text-gray-700 font-medium break-words">{formatted}</span>;
};
