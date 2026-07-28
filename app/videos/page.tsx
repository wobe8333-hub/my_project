'use client'

import { useEffect, useState } from 'react'
import TopTabs from '@/app/components/TopTabs'
import { extractYoutubeId } from '@/lib/youtube'

interface VideoItem {
  id: string
  name: string
  youtube_url: string
}

interface VideosResponse {
  categories: { category: string; items: VideoItem[] }[]
}

export default function VideosPage() {
  const [data, setData] = useState<VideosResponse | null>(null)

  useEffect(() => {
    fetch('/api/videos')
      .then((res) => res.json())
      .then(setData)
  }, [])

  if (!data) {
    return (
      <>
        <TopTabs />
        <main className="page"><p className="text-secondary">불러오는 중...</p></main>
      </>
    )
  }

  return (
    <>
      <TopTabs />
      <main className="page">
        <h1 className="page-title">운동기구 사용법</h1>

        {data.categories.length === 0 && (
          <p className="text-secondary">아직 등록된 영상이 없어요</p>
        )}

        {data.categories.map((group) => (
          <section key={group.category} className="stack">
            <span className="card-title">{group.category}</span>
            {group.items.map((item) => {
              const videoId = extractYoutubeId(item.youtube_url)
              return (
                <div className="card" key={item.id}>
                  <span className="card-title">{item.name}</span>
                  {videoId ? (
                    <iframe
                      className="video-embed"
                      src={`https://www.youtube.com/embed/${videoId}`}
                      title={item.name}
                      allowFullScreen
                    />
                  ) : (
                    <a className="text-link" href={item.youtube_url} target="_blank" rel="noreferrer">
                      영상 링크 열기
                    </a>
                  )}
                </div>
              )
            })}
          </section>
        ))}
      </main>
    </>
  )
}
