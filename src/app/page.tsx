export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center min-h-screen">
      <main className="flex flex-col items-center gap-6 text-center px-4">
        <h1 className="text-3xl font-bold text-foreground">
          당신의 발에 꼭 맞는 인솔, 과학이 설계합니다
        </h1>
        <p className="text-lg text-muted max-w-md">
          스마트폰으로 발을 측정하고, 맞춤 인솔로 편안함을 경험하세요
        </p>
        <button className="h-12 px-8 bg-accent text-white font-bold rounded-lg hover:bg-accent/90 transition-colors">
          내 발에 맞는 신발 찾기
        </button>
      </main>
    </div>
  );
}
