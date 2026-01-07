# 협업 도구 (Collaboration Tool)

Next.js와 Tailwind CSS를 사용한 실시간 협업 도구입니다. 여러 사용자가 동시에 그림을 그리거나 문서를 편집할 수 있으며, Slack과 같은 채팅 기능도 제공합니다.

## 주요 기능

- 🎨 **실시간 그림 그리기**: 여러 사용자가 동시에 캔버스에 그림을 그릴 수 있습니다
- 📝 **공동 문서 편집**: 실시간으로 문서를 함께 편집할 수 있습니다
- 💬 **채팅 기능**: Slack과 같은 실시간 채팅 기능
- 👥 **사용자 목록**: 현재 접속한 사용자 목록을 실시간으로 확인할 수 있습니다

## 기술 스택

- **Frontend**: Next.js 14, React 18, Tailwind CSS
- **Backend**: Socket.IO (WebSocket)
- **그림 그리기**: Fabric.js
- **문서 편집**: React Quill

## 설치 및 실행

### 1. 프로젝트 의존성 설치

```bash
npm install
```

### 2. 서버 의존성 설치

```bash
cd server
npm install
cd ..
```

### 3. 개발 서버 실행

터미널 1 - Next.js 개발 서버:
```bash
npm run dev
```

터미널 2 - Socket.IO 서버:
```bash
cd server
npm start
```

### 4. 브라우저에서 접속

- Next.js 앱: http://localhost:3000
- Socket.IO 서버: http://localhost:3001

## 프로젝트 구조

```
collab_tool/
├── src/
│   ├── app/              # Next.js App Router 페이지
│   │   ├── page.tsx      # 홈 페이지 (로그인)
│   │   ├── workspace/    # 작업 공간 페이지
│   │   └── layout.tsx    # 루트 레이아웃
│   └── components/       # React 컴포넌트
│       ├── ChatPanel.tsx      # 채팅 패널
│       ├── DrawingBoard.tsx   # 그림 그리기 보드
│       ├── DocumentEditor.tsx # 문서 편집기
│       └── UserList.tsx       # 사용자 목록
├── server/               # Socket.IO 서버
│   └── index.js
└── package.json
```

## 사용 방법

1. 브라우저에서 http://localhost:3000 접속
2. 사용자 이름을 입력하고 "시작하기" 클릭
3. 작업 공간에서 다음 기능 사용:
   - **그림 그리기 탭**: 캔버스에 그림을 그릴 수 있습니다
   - **문서 편집 탭**: 공동으로 문서를 편집할 수 있습니다
   - **채팅 패널**: 다른 사용자와 실시간으로 채팅할 수 있습니다
   - **사용자 목록**: 현재 접속한 사용자를 확인할 수 있습니다

## 개발 스크립트

- `npm run dev`: Next.js 개발 서버 시작
- `npm run build`: 프로덕션 빌드
- `npm run start`: 프로덕션 서버 시작
- `npm run lint`: ESLint 실행

## 라이선스

MIT
