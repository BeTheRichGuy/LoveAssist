import { router } from 'expo-router';
import { View } from 'react-native';

import { BackIcon } from '@/components/icons';
import { AppText } from '@/components/text';
import { Card, IconButton, Screen } from '@/components/ui';
import { colors } from '@/theme/tokens';

// 개인정보 처리방침 요약 (지인 테스트용). 전문 처리방침은 공개본에 포함하지 않았다.
// 앱이 실제로 하는 일과 어긋나면 안 되므로, 기능을 바꾸면 이 화면과 초안을 같이 고친다.
const SECTIONS: { title: string; body: string[] }[] = [
  {
    title: '이 기기에만 저장해요',
    body: [
      '온보딩 답변, 상대 닉네임 · 관계 단계 · 성향 · 메모는 이 기기에 암호화해서 저장해요.',
      '운영자 서버에는 저장하지 않아요. 회원가입이 없고 이름 · 연락처를 받지 않아요.',
    ],
  },
  {
    title: 'AI로 보내는 것',
    body: [
      '판독 · 대화 연습 · 채점을 할 때만, 이름을 가린 대화(최근 50줄까지)와 상대 닉네임 · 성향 · 메모를 보내요.',
      '중계 서버(Cloudflare, 미국)를 거쳐 AI(Anthropic, 미국)로 가요. 중계 서버는 내용을 저장하거나 기록하지 않아요.',
      '보낸 내용은 AI 학습이나 다른 사람을 위한 서비스에 쓰지 않아요.',
      '붙여넣은 대화 원문은 분석 직후 지워요.',
      '캡처를 올리면 글자는 이 기기 안에서 읽고, 이미지는 보내지 않아요. 앱이 만든 복사본은 읽은 직후 지워요.',
      '말투 학습: 불러오거나 카톡 · 라인에서 공유받은 대화 파일은 읽은 직후 지우고, 이름을 가린 최근 대화(150줄까지)만 보내요. 저장되는 건 내가 승인한 말투 요약뿐이에요.',
    ],
  },
  {
    title: '자동으로 남는 것',
    body: [
      '서버 기록: 요청 종류 · 응답 코드 · 처리 시간만 (대화 내용 없음).',
      '하루 사용량 한도를 위해 익명 설치값별 오늘 사용 횟수만 세요. 마지막 사용 3일 뒤 자동으로 지워요.',
      '앱 오류가 나면 오류 종류 · 코드 위치 · 기기 모델 · OS 버전을 보내요 (대화 · 입력 · 화면 캡처 제외).',
    ],
  },
  {
    title: '지우는 방법',
    body: [
      '프로필 → 정리하기: 상대 정보를 모두 지워요.',
      '설정 → 처음부터 다시 하기: 모든 기록을 지워요. 앱을 삭제해도 모두 지워져요.',
      '지운 내용은 저장소에서 덮어써 되살릴 수 없어요.',
    ],
  },
];

export default function Privacy() {
  return (
    <Screen scroll>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <IconButton label="뒤로" onPress={() => router.back()} style={{ marginLeft: -12 }}>
          <BackIcon size={22} />
        </IconButton>
        <AppText variant="title">개인정보 처리방침</AppText>
        <View style={{ width: 44 }} />
      </View>
      <AppText variant="caption">
        테스트 버전용 요약이에요. 정식 출시 전에 전문을 법률 검토 후 공개해요.
      </AppText>
      {SECTIONS.map((s) => (
        <Card key={s.title} style={{ gap: 8 }}>
          <AppText variant="bodyBold">{s.title}</AppText>
          {s.body.map((line) => (
            <AppText key={line} style={{ fontSize: 14, lineHeight: 22 }} color={colors.textSoft}>
              • {line}
            </AppText>
          ))}
        </Card>
      ))}
    </Screen>
  );
}
