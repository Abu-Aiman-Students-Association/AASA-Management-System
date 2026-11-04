update public.permissions
set module_key = case
  when permission_key in ('cards.issue','cards.revoke') then 'id_center'
  when permission_key in ('membership.archive','membership.create','membership.export','membership.import','membership.read','membership.review','membership.self.read','membership.update') then 'membership'
  when permission_key in ('committees.assigned.read','committees.manage','executives.manage') then 'governance'
  when permission_key in ('attendance.record','events.manage','meetings.manage','meetings.self.read') then 'meetings'
  when permission_key in ('complaints.manage','complaints.review','complaints.submit') then 'complaints'
  when permission_key in ('announcements.publish','announcements.read','notifications.manage','notifications.self.read','notifications.send') then 'communications'
  when permission_key in ('projects.approve','projects.manage','tasks.manage') then 'projects'
  when permission_key in ('documents.manage','reports.export','reports.read') then 'documents'
  when permission_key in ('system.audit.read','platform.admins.manage','platform.health.read','platform.recovery.manage','platform.super_admin.bootstrap','system.roles.manage','system.settings.manage','system.settings.read','system.users.manage') then 'administration'
  else module_key
end
where permission_key in (
  'cards.issue','cards.revoke',
  'membership.archive','membership.create','membership.export','membership.import','membership.read','membership.review','membership.self.read','membership.update',
  'committees.assigned.read','committees.manage','executives.manage',
  'attendance.record','events.manage','meetings.manage','meetings.self.read',
  'complaints.manage','complaints.review','complaints.submit',
  'announcements.publish','announcements.read','notifications.manage','notifications.self.read','notifications.send',
  'projects.approve','projects.manage','tasks.manage',
  'documents.manage','reports.export','reports.read',
  'system.audit.read','platform.admins.manage','platform.health.read','platform.recovery.manage','platform.super_admin.bootstrap','system.roles.manage','system.settings.manage','system.settings.read','system.users.manage'
);
