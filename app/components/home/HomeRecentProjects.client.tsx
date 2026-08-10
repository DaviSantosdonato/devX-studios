import { formatDistanceToNow } from 'date-fns';
import { useEffect, useState } from 'react';
import { db, getAll, type ChatHistoryItem } from '~/lib/persistence';
import { classNames } from '~/utils/classNames';

import styles from './HomeStart.module.scss';

const RECENT_PROJECT_LIMIT = 6;

export function HomeRecentProjects() {
  const [projects, setProjects] = useState<ChatHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    if (!db) {
      setLoading(false);
      return undefined;
    }

    getAll(db)
      .then((items) => {
        if (!active) {
          return;
        }

        const recentProjects = items
          .filter((item) => item.urlId && item.description)
          .toSorted((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp))
          .slice(0, RECENT_PROJECT_LIMIT);

        setProjects(recentProjects);
      })
      .catch(() => {
        if (active) {
          setProjects([]);
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  return <RecentProjectsContent projects={projects} loading={loading} />;
}

interface RecentProjectsContentProps {
  projects: ChatHistoryItem[];
  loading: boolean;
}

function RecentProjectsContent({ projects, loading }: RecentProjectsContentProps) {
  return (
    <section className={styles.Recent} aria-labelledby="recent-projects-title" aria-busy={loading}>
      <div className={styles.RecentHeading}>
        <div>
          <h2 id="recent-projects-title" className="devx-type-heading-3">
            Recent projects
          </h2>
          <p className="devx-type-caption">Continue where you left off</p>
        </div>
        <span className="devx-badge">
          <span className="i-ph:hard-drives-duotone devx-icon--sm" aria-hidden="true" />
          Local
        </span>
      </div>

      {loading ? (
        <div className={styles.RecentGrid} aria-label="Loading recent projects">
          {Array.from({ length: 2 }, (_, index) => (
            <div key={index} className={classNames(styles.ProjectItem, styles.ProjectSkeleton)} aria-hidden="true" />
          ))}
        </div>
      ) : projects.length > 0 ? (
        <div className={styles.RecentGrid}>
          {projects.map((project) => (
            <a key={project.id} href={`/chat/${project.urlId}`} className={styles.ProjectItem}>
              <span className={styles.ProjectIcon} aria-hidden="true">
                <span className="i-ph:code-duotone devx-icon--md" />
              </span>
              <span className={styles.ProjectContent}>
                <span className={styles.ProjectTitle}>{project.description}</span>
                <time className="devx-type-caption" dateTime={project.timestamp}>
                  {formatActivity(project.timestamp)}
                </time>
              </span>
              <span className="i-ph:arrow-up-right devx-icon--sm" aria-hidden="true" />
            </a>
          ))}
        </div>
      ) : (
        <div className={styles.EmptyState}>
          <span className={styles.EmptyIcon} aria-hidden="true">
            <span className="i-ph:folder-notch-open-duotone devx-icon--lg" />
          </span>
          <span>
            <strong>No projects yet</strong>
            <small>Start with an idea above.</small>
          </span>
        </div>
      )}
    </section>
  );
}

function formatActivity(timestamp: string) {
  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return 'Recently updated';
  }

  return `Updated ${formatDistanceToNow(date, { addSuffix: true })}`;
}
