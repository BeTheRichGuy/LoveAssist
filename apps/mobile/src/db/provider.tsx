import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/text';
import { Button } from '@/components/ui';
import { colors } from '@/theme/tokens';

import { openDb, type Db, type DbInfo } from './client';

type DbState =
  | { status: 'loading' }
  | { status: 'ready'; db: Db; info: DbInfo }
  /** 웹 미리보기: DB 없이 메모리로만 */
  | { status: 'unsupported' }
  | { status: 'error'; message: string };

const Ctx = createContext<DbState>({ status: 'loading' });

/** 앱 시작 시 암호화 DB를 연다. 실패하면 앱을 진행하지 않고 다시 시도 화면을 보여 준다 */
export function DbProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DbState>({ status: 'loading' });

  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    openDb().then(
      (res) => alive && setState(res ? { status: 'ready', ...res } : { status: 'unsupported' }),
      (e) =>
        alive && setState({ status: 'error', message: e instanceof Error ? e.message : String(e) }),
    );
    return () => {
      alive = false;
    };
  }, [attempt]);

  const retry = () => {
    setState({ status: 'loading' });
    setAttempt((a) => a + 1);
  };

  if (state.status === 'loading') return <View style={styles.fill} />;
  if (state.status === 'error') {
    return (
      <View style={[styles.fill, styles.center]}>
        <AppText variant="title">저장소를 열지 못했어요</AppText>
        <AppText variant="caption" style={{ textAlign: 'center' }}>
          {state.message}
        </AppText>
        <Button label="다시 시도" onPress={retry} style={{ alignSelf: 'stretch' }} />
      </View>
    );
  }
  return <Ctx.Provider value={state}>{children}</Ctx.Provider>;
}

export const useDb = () => useContext(Ctx);

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.bg },
  center: { alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 },
});
