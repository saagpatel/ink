import { useCallback, useMemo, useState } from "react";
import {
	type AnnotationStats,
	getAnnotationStats,
	getAnnotationsForFile,
	insertAnnotation,
	updateAnnotationStatus,
} from "../lib/db";
import type { Annotation } from "../types";

export function useAnnotations() {
	const [annotations, setAnnotations] = useState<Annotation[]>([]);
	const [allAnnotations, setAllAnnotations] = useState<Annotation[]>([]);
	const [stats, setStats] = useState<AnnotationStats>({
		pending: 0,
		accepted: 0,
		dismissed: 0,
	});
	const [fileId, setFileId] = useState<number | null>(null);
	const [lastLatencyMs, setLastLatencyMs] = useState<number | null>(null);

	const loadAnnotations = useCallback(async (fId: number) => {
		setFileId(fId);
		const rows = await getAnnotationsForFile(fId);
		setAllAnnotations(rows);
		setAnnotations(rows.filter((a) => a.status === "pending"));
		const s = await getAnnotationStats(fId);
		setStats(s);
	}, []);

	const addAnnotation = useCallback(
		async (annotation: Omit<Annotation, "id" | "createdAt">) => {
			const id = await insertAnnotation(annotation);
			const newAnnotation: Annotation = {
				...annotation,
				id,
				createdAt: new Date().toISOString(),
			};
			setAnnotations((prev) => [...prev, newAnnotation]);
			setAllAnnotations((prev) => [newAnnotation, ...prev]);
			setStats((prev) => ({ ...prev, pending: prev.pending + 1 }));
			if (annotation.latencyMs !== null) {
				setLastLatencyMs(annotation.latencyMs);
			}
			return newAnnotation;
		},
		[],
	);

	const acceptAnnotation = useCallback(
		async (id: number): Promise<Annotation | undefined> => {
			const annotation = annotations.find((a) => a.id === id);
			if (!annotation) return undefined;

			await updateAnnotationStatus(id, "accepted");
			setAnnotations((prev) => prev.filter((a) => a.id !== id));
			setAllAnnotations((prev) =>
				prev.map((a) =>
					a.id === id ? { ...a, status: "accepted" as const } : a,
				),
			);
			setStats((prev) => ({
				...prev,
				pending: Math.max(0, prev.pending - 1),
				accepted: prev.accepted + 1,
			}));
			return annotation;
		},
		[annotations],
	);

	const dismissAnnotation = useCallback(async (id: number) => {
		await updateAnnotationStatus(id, "dismissed");
		setAnnotations((prev) => prev.filter((a) => a.id !== id));
		setAllAnnotations((prev) =>
			prev.map((a) =>
				a.id === id ? { ...a, status: "dismissed" as const } : a,
			),
		);
		setStats((prev) => ({
			...prev,
			pending: Math.max(0, prev.pending - 1),
			dismissed: prev.dismissed + 1,
		}));
	}, []);

	const clearAnnotations = useCallback(() => {
		setAnnotations([]);
		setAllAnnotations([]);
		setStats({ pending: 0, accepted: 0, dismissed: 0 });
		setFileId(null);
		setLastLatencyMs(null);
	}, []);

	const grouped = useMemo(() => {
		const pending = allAnnotations.filter((a) => a.status === "pending");
		const accepted = allAnnotations.filter((a) => a.status === "accepted");
		const dismissed = allAnnotations.filter((a) => a.status === "dismissed");
		return { pending, accepted, dismissed };
	}, [allAnnotations]);

	return {
		annotations,
		allAnnotations,
		grouped,
		stats,
		lastLatencyMs,
		fileId,
		loadAnnotations,
		addAnnotation,
		acceptAnnotation,
		dismissAnnotation,
		clearAnnotations,
	};
}
