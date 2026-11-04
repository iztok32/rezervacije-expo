import { NativeTabs } from 'expo-router/native-tabs';
import { useColorScheme } from '@/hooks/use-color-scheme';

import { Colors, FontFamily } from '@/constants/theme';
import { manageItems } from '@/lib/manage-menu';
import { useSession } from '@/lib/session';

export default function AppTabs() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const { user } = useSession();
  // Uporabnik je znan pred prikazom zavihkov, zato se vidnost med uporabo ne spreminja
  const canManage = manageItems(user).length > 0;

  return (
    <NativeTabs
      backgroundColor={colors.backgroundElement}
      tintColor={colors.primary}
      iconColor={{ default: colors.textSecondary, selected: colors.primary }}
      indicatorColor={colors.primarySoft}
      rippleColor={colors.primarySoft}
      labelStyle={{
        default: { color: colors.textSecondary, fontFamily: FontFamily.semibold, fontSize: 12 },
        selected: { color: colors.primary, fontFamily: FontFamily.bold, fontSize: 12 },
      }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Domov</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'house', selected: 'house.fill' }} md="home" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="calendar">
        <NativeTabs.Trigger.Label>Termini</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="calendar" md="calendar_month" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="coupons">
        <NativeTabs.Trigger.Label>Kuponi</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'ticket', selected: 'ticket.fill' }} md="confirmation_number" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Label>Profil</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'person.crop.circle', selected: 'person.crop.circle.fill' }} md="person" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="manage" hidden={!canManage}>
        <NativeTabs.Trigger.Label>Upravljanje</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="gearshape" md="settings" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
