import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faBookOpen,
    faBuilding,
    faChevronLeft,
    faChevronRight,
    faDownload,
    faFolderTree,
    faGaugeHigh,
    faLayerGroup,
    faNewspaper,
    faPenRuler,
    faPeopleGroup,
} from "@fortawesome/free-solid-svg-icons";
import MainLayout from "../../layout/MainLayout";
import InteractiveCadPreview from "../../components/CadPreview/InteractiveCadPreview";
import { apiFetch, apiUrl } from "../../contexts/api";
import "./GeneralPage.scss";

interface UserData {
    id: number;
    email: string;
    username?: string;
}

interface DownloadItem {
    id: number;
    title: string;
    content: string;
    version?: string;
    platform?: string;
    file_name?: string;
    file_size?: string;
    created_at?: string;
    updated_at?: string;
}

const GeneralPage: React.FC = () => {
    const navigate = useNavigate();

    const [user, setUser] = useState<UserData | null>(null);
    const [loading, setLoading] = useState(true);
    const [downloads, setDownloads] = useState<DownloadItem[]>([]);
    const [downloadsLoading, setDownloadsLoading] = useState(true);
    const [downloadingId, setDownloadingId] = useState<number | null>(null);
    const [activeBuildIndex, setActiveBuildIndex] = useState(0);
    const buildListRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const userData = localStorage.getItem("user");

        if (!userData) {
            setUser(null);
            setLoading(false);
            return;
        }

        try {
            const parsed = JSON.parse(userData);
            setUser(parsed);
        } catch (error) {
            console.error("Ошибка чтения user:", error);
            localStorage.removeItem("user");
            setUser(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const loadDownloads = async () => {
            setDownloadsLoading(true);

            try {
                const data = await apiFetch<DownloadItem[]>("/download/", {
                    redirectOnError: false,
                });

                setDownloads(Array.isArray(data) ? data.slice(0, 3) : []);
            } catch (error) {
                console.error("Ошибка загрузки версий приложения:", error);
                setDownloads([]);
            } finally {
                setDownloadsLoading(false);
            }
        };

        void loadDownloads();
    }, []);

    const handleDownload = async (item: DownloadItem) => {
        setDownloadingId(item.id);

        try {
            const response = await fetch(apiUrl(`/download/${item.id}/`), {
                credentials: "include",
            });

            if (!response.ok) {
                throw new Error("Не удалось скачать файл");
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");

            link.href = url;
            link.download = item.file_name || `${item.title || "ourpaint"}-${item.version || "build"}.zip`;

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            window.URL.revokeObjectURL(url);
        } catch (error) {
            alert(error instanceof Error ? error.message : "Не удалось скачать файл");
        } finally {
            setDownloadingId(null);
        }
    };

    const formatFileSize = (size?: string) => {
        if (!size) return "Размер не указан";

        const value = Number(size);

        if (!Number.isFinite(value)) return size;
        if (value < 1024) return `${value} B`;
        if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
        return `${(value / (1024 * 1024)).toFixed(1)} MB`;
    };

    const latestVersion = downloads[0]?.version ? `v${downloads[0].version}` : "alpha";
    const latestDate = downloads[0]?.updated_at || downloads[0]?.created_at;

    const scrollToBuild = (index: number) => {
        const list = buildListRef.current;
        const card = list?.querySelector<HTMLElement>(".general-build");

        if (!list || !card) return;

        const nextIndex = Math.max(0, Math.min(index, downloads.length - 1));

        list.scrollTo({
            left: nextIndex * (card.offsetWidth + 12),
            behavior: "smooth",
        });

        setActiveBuildIndex(nextIndex);
    };

    const handleBuildScroll = () => {
        const list = buildListRef.current;
        const card = list?.querySelector<HTMLElement>(".general-build");

        if (!list || !card) return;

        const nextIndex = Math.round(list.scrollLeft / (card.offsetWidth + 12));

        setActiveBuildIndex(Math.max(0, Math.min(nextIndex, downloads.length - 1)));
    };

    useEffect(() => {
        setActiveBuildIndex(0);
        buildListRef.current?.scrollTo({ left: 0 });
    }, [downloads.length]);

    useEffect(() => {
        const sections = document.querySelectorAll<HTMLElement>(".scroll-reveal");

        if (sections.length === 0) return undefined;

        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add("is-visible");
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.18 });

        sections.forEach((section) => observer.observe(section));

        return () => observer.disconnect();
    }, [downloadsLoading, downloads.length]);

    if (loading) {
        return (
            <MainLayout isAuthenticated={!!user}>
                <p>Загрузка...</p>
            </MainLayout>
        );
    }

    return (
        <MainLayout isAuthenticated={!!user}>
            <div className="main-page page">
                <section className="general-hero">
                    <div className="general-hero-copy">
                        <span className="general-eyebrow">
                            <span /> Current build · {latestVersion}
                        </span>
                        <h1>OurPaint CAD</h1>
                        <p className="general-lead">
                            Система автоматизированного проектирования для 2D-геометрии, координатной сетки и проектных файлов.
                        </p>
                        <p className="general-description">
                            Создавайте построения, храните проекты в репозиториях, делитесь сборками и работайте с форматом <code>.ourp</code> в едином пространстве OurPaint.
                        </p>

                        <div className="general-hero-actions">
                            <button className="btn-primary" onClick={() => navigate("/repositories")} type="button">
                                <FontAwesomeIcon icon={faPenRuler} />
                                Открыть проекты
                            </button>
                            <button className="secondary-btn" onClick={() => navigate("/download")} type="button">
                                <FontAwesomeIcon icon={faDownload} />
                                Все версии
                            </button>
                            <button className="link-btn" onClick={() => navigate("/docs")} type="button">
                                <FontAwesomeIcon icon={faBookOpen} />
                                Документация
                            </button>
                        </div>

                        <p className="general-meta">
                            {latestVersion}
                            {latestDate && (
                                <>
                                    {" "}· обновлено {new Date(latestDate).toLocaleDateString("ru-RU")}
                                </>
                            )}
                            {" "}· project format <span>.ourp</span>
                        </p>
                    </div>

                    <InteractiveCadPreview />
                </section>

                <section className="general-version-panel scroll-reveal">
                    <div>
                        <p className="section-label">Текущие сборки</p>
                        <h2>Последние 3 версии</h2>
                    </div>

                    {downloads.length > 1 && (
                        <div className="general-version-controls" aria-label="РџРµСЂРµРєР»СЋС‡РµРЅРёРµ РІРµСЂСЃРёР№">
                            <button
                                aria-label="РџСЂРµРґС‹РґСѓС‰Р°СЏ РІРµСЂСЃРёСЏ"
                                disabled={activeBuildIndex === 0}
                                onClick={() => scrollToBuild(activeBuildIndex - 1)}
                                type="button"
                            >
                                <FontAwesomeIcon icon={faChevronLeft} />
                            </button>
                            <button
                                aria-label="РЎР»РµРґСѓСЋС‰Р°СЏ РІРµСЂСЃРёСЏ"
                                disabled={activeBuildIndex === downloads.length - 1}
                                onClick={() => scrollToBuild(activeBuildIndex + 1)}
                                type="button"
                            >
                                <FontAwesomeIcon icon={faChevronRight} />
                            </button>
                        </div>
                    )}

                    <div
                        className="general-build-list"
                        onScroll={handleBuildScroll}
                        ref={buildListRef}
                    >
                        {downloadsLoading ? (
                            <div className="general-build-empty">Загрузка версий...</div>
                        ) : downloads.length === 0 ? (
                            <div className="general-build-empty">Пока нет опубликованных сборок</div>
                        ) : (
                            <div className="general-build-track">
                                {downloads.map((item) => (
                                    <article
                                        className="general-build"
                                        key={item.id}
                                    >
                                        <div>
                                            <span className="badge">{item.platform || "all"}</span>
                                            <h3>{item.title}</h3>
                                            <p>{item.content}</p>
                                            <div className="general-build-meta">
                                                <span>{item.version ? `v${item.version}` : "version n/a"}</span>
                                                <span>{formatFileSize(item.file_size)}</span>
                                            </div>
                                        </div>

                                        <button
                                            className="download-action-primary"
                                            disabled={downloadingId === item.id}
                                            onClick={() => handleDownload(item)}
                                            type="button"
                                        >
                                            <FontAwesomeIcon icon={faDownload} />
                                            {downloadingId === item.id ? "..." : "Скачать"}
                                        </button>
                                    </article>
                                ))}
                            </div>
                        )}
                    </div>

                </section>

                <section className="general-capabilities scroll-reveal">
                    <div>
                        <p className="section-label">Возможности CAD</p>
                        <h2>Рабочий контур OurPaint</h2>
                    </div>

                    <div className="general-cap-grid">
                        <div className="general-cap">
                            <FontAwesomeIcon icon={faPenRuler} />
                            <h3>OurPaintDCM</h3>
                            <p>2D Dimensional Constraint Manager для размерных ограничений и точной геометрии.</p>
                        </div>
                        <div className="general-cap">
                            <FontAwesomeIcon icon={faGaugeHigh} />
                            <h3>Координатная сетка</h3>
                            <p>Оси, точки и числовые метки для точного позиционирования объектов.</p>
                        </div>
                        <div className="general-cap">
                            <FontAwesomeIcon icon={faLayerGroup} />
                            <h3>Формат .ourp</h3>
                            <p>Проектные файлы, версии и ZIP-сборки хранятся рядом с историей изменений.</p>
                        </div>
                        <div className="general-cap">
                            <FontAwesomeIcon icon={faPeopleGroup} />
                            <h3>Командная работа</h3>
                            <p>Компании и репозитории помогают вести общие CAD-проекты без хаоса.</p>
                        </div>
                    </div>
                </section>

                <section className="dashboard-grid general-navigation-grid scroll-reveal">
                    <div className="dashboard-card" onClick={() => navigate("/news")}>
                        <div className="card-icon">
                            <FontAwesomeIcon icon={faNewspaper} />
                        </div>

                        <h3>Новости</h3>

                        <p>
                            Обновления OurPaint, релизы, публикации и важные объявления команды.
                        </p>

                        <button
                            className="card-link mt-5"
                            onClick={(event) => {
                                event.stopPropagation();
                                navigate("/news");
                            }}
                            type="button"
                        >
                            Открыть новости
                            <FontAwesomeIcon icon={faChevronRight} />
                        </button>
                    </div>

                    <div className="dashboard-card" onClick={() => navigate("/repositories")}>
                        <div className="card-icon">
                            <FontAwesomeIcon icon={faFolderTree} />
                        </div>

                        <h3>Репозитории</h3>

                        <p>
                            Храните проектные файлы, версии, ZIP-сборки и историю изменений.
                        </p>

                        <button
                            className="card-link mt-5"
                            onClick={(event) => {
                                event.stopPropagation();
                                navigate("/repositories");
                            }}
                            type="button"
                        >
                            Перейти к репозиториям
                            <FontAwesomeIcon icon={faChevronRight} />
                        </button>
                    </div>

                    <div className="dashboard-card" onClick={() => navigate("/companies")}>
                        <div className="card-icon">
                            <FontAwesomeIcon icon={faBuilding} />
                        </div>

                        <h3>Компании</h3>

                        <p>
                            Создавайте команды, управляйте участниками и ведите общие проекты.
                        </p>

                        <button
                            className="card-link mt-5"
                            onClick={(event) => {
                                event.stopPropagation();
                                navigate("/companies");
                            }}
                            type="button"
                        >
                            Открыть компании
                            <FontAwesomeIcon icon={faChevronRight} />
                        </button>
                    </div>
                </section>
            </div>
        </MainLayout>
    );
};

export default GeneralPage;
