import * as LocalAuthentication from 'expo-local-authentication';
import { useEffect, useMemo, useState } from 'react';
import { Platform, StyleSheet, Switch, View } from 'react-native';

import { checkDbFile, type FileCheck } from '@/db/inspect';
import { useDb } from '@/db/provider';
import { getSetting, setSetting } from '@/db/settings';
import { deviceSecurityLevel, LOCK_GRACE_MS, useAppLock } from '@/security/app-lock';
import { colors, fonts } from '@/theme/tokens';

import { AppText } from './text';
import { Button, Card } from './ui';

const SELFTEST_KEY = 'selftest.lastWrite';

function Row({ label, value, ok }: { label: string; value: string; ok: boolean | null }) {
  return (
    <View style={styles.row}>
      <AppText style={{ flex: 1, fontSize: 14 }}>{label}</AppText>
      <AppText
        style={{ fontSize: 13, fontFamily: fonts.bold, textAlign: 'right', flexShrink: 1 }}
        color={ok === null ? colors.textSub : ok ? colors.accent : colors.warning}
      >
        {ok === null ? '' : ok ? '✓ ' : '✗ '}
        {value}
      </AppText>
    </View>
  );
}

const fileLabel: Record<FileCheck, string> = {
  encrypted: '암호화됨',
  plain: '암호화 안 됨',
  missing: '파일 없음',
};

/** 설정 화면의 보안 영역: 앱 잠금 켜기/끄기 + 실제 기기에서 보안 설정이 동작하는지 점검 */
export function SecurityPanel() {
  const dbState = useDb();
  const lock = useAppLock();
  const [lockMsg, setLockMsg] = useState<string | null>(null);
  const [level, setLevel] = useState<LocalAuthentication.SecurityLevel | null>(null);
  const [lastWrite, setLastWrite] = useState<string | null>(null);

  const db = dbState.status === 'ready' ? dbState.db : null;
  const info = dbState.status === 'ready' ? dbState.info : null;
  // 기록할 때마다 파일을 다시 읽도록 lastWrite를 의존값에 넣는다
  const fileCheck = useMemo<FileCheck | null>(
    () => (info && lastWrite !== undefined ? checkDbFile(info.path) : null),
    [info, lastWrite],
  );

  useEffect(() => {
    deviceSecurityLevel().then(setLevel);
    if (db) getSetting(db, SELFTEST_KEY).then(setLastWrite);
  }, [db]);

  if (Platform.OS === 'web') {
    return (
      <Card>
        <AppText variant="bodyBold">보안</AppText>
        <AppText variant="caption">
          웹 미리보기에서는 암호화 저장소와 앱 잠금이 동작하지 않아요. 폰에서 확인해 주세요.
        </AppText>
      </Card>
    );
  }

  const apiLevel = typeof Platform.Version === 'number' ? Platform.Version : 0;
  const recentsHidden = Platform.OS === 'android' ? apiLevel >= 33 : true;
  const levelLabel =
    level === LocalAuthentication.SecurityLevel.BIOMETRIC_STRONG ||
    level === LocalAuthentication.SecurityLevel.BIOMETRIC_WEAK
      ? '생체인증 사용 가능'
      : level === LocalAuthentication.SecurityLevel.SECRET
        ? 'PIN · 패턴만 있음'
        : level === null
          ? '확인 중'
          : '화면 잠금 없음';

  async function toggleLock(v: boolean) {
    setLockMsg(null);
    const ok = await lock.setEnabled(v);
    if (!ok)
      setLockMsg(
        v && level === LocalAuthentication.SecurityLevel.NONE
          ? '기기에 화면 잠금이 없어서 켤 수 없어요. 기기 설정에서 먼저 켜 주세요.'
          : '본인 확인을 하지 못해 바꾸지 않았어요.',
      );
  }

  async function writeSelftest() {
    if (!db || !info) return;
    const now = new Date().toLocaleString('ko-KR');
    await setSetting(db, SELFTEST_KEY, now);
    setLastWrite(await getSetting(db, SELFTEST_KEY));
  }

  return (
    <>
      <Card>
        <View style={styles.row}>
          <View style={{ flex: 1, gap: 2 }}>
            <AppText variant="bodyBold">앱 잠금</AppText>
            <AppText variant="caption">
              앱을 열 때와 {LOCK_GRACE_MS / 60000}분 넘게 나갔다 돌아올 때 잠가요
            </AppText>
          </View>
          <Switch
            value={lock.enabled}
            onValueChange={toggleLock}
            trackColor={{ true: colors.accent, false: colors.border }}
            thumbColor={colors.text}
            accessibilityLabel="앱 잠금"
          />
        </View>
        {lockMsg ? (
          <AppText variant="caption" color={colors.warning}>
            {lockMsg}
          </AppText>
        ) : null}
      </Card>

      <Card style={{ gap: 10 }}>
        <AppText variant="bodyBold">보안 점검</AppText>
        <Row
          label="DB 암호화 (SQLCipher)"
          value={info ? `켜짐 ${info.cipherVersion}` : '열지 못함'}
          ok={info ? true : false}
        />
        <Row
          label="디스크의 DB 파일"
          value={fileCheck ? fileLabel[fileCheck] : '확인 중'}
          ok={fileCheck === null ? null : fileCheck === 'encrypted'}
        />
        <Row label="암호화 키 보관" value="기기 보안 저장소" ok />
        <Row
          label="기기 화면 잠금"
          value={levelLabel}
          ok={level === null ? null : level !== LocalAuthentication.SecurityLevel.NONE}
        />
        <Row
          label="최근 앱 미리보기 가림"
          value={
            Platform.OS === 'android'
              ? recentsHidden
                ? `켜짐 (Android ${apiLevel >= 33 ? '13+' : ''})`
                : `이 기기는 미지원 (API ${apiLevel}) · 덮개 화면으로 대신`
              : '덮개 화면'
          }
          ok={recentsHidden}
        />
        <Row label="OS 자동 백업" value="꺼짐" ok />
        {info?.recreated ? (
          <AppText variant="caption" color={colors.warning}>
            이전 저장소를 열 수 없어 새로 만들었어요 (키가 없는 DB 파일).
          </AppText>
        ) : null}
      </Card>

      <Card style={{ gap: 10 }}>
        <AppText variant="bodyBold">저장 점검</AppText>
        <AppText variant="caption">
          기록한 뒤 앱을 완전히 껐다 켜서 같은 시각이 남아 있으면 암호화 DB에 잘 저장되는 거예요.
        </AppText>
        <Row label="마지막 기록" value={lastWrite ?? '아직 없음'} ok={null} />
        <Button label="지금 기록하기" variant="secondary" onPress={writeSelftest} disabled={!db} />
      </Card>
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 32 },
});
