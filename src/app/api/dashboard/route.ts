import { getAuthenticatedClient } from '@/lib/api/auth';
import { errorJson, isUuid, json, supabaseErrorResponse } from '@/lib/api/http';
import { processStatuses } from '@/lib/processes/constants';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

const activeProcessStatuses = processStatuses.filter(
  (status) => !['hired', 'rejected', 'withdrawn'].includes(status),
);

export async function GET(request: NextRequest) {
  try {
    const organizationId = request.nextUrl.searchParams.get('organizationId');
    if (!isUuid(organizationId)) {
      return errorJson('Informe um organizationId válido.', 400);
    }

    const { supabase, userId } = await getAuthenticatedClient();
    if (!userId) {
      return errorJson('É necessário estar autenticado.', 401);
    }

    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);

    const [
      activeResult,
      interviewResult,
      documentationResult,
      hiredResult,
      recentProcessesResult,
      pendingDocumentsResult,
      historyResult,
    ] = await Promise.all([
      supabase
        .from('recruitment_processes')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .in('status', activeProcessStatuses),
      supabase
        .from('recruitment_processes')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('status', 'interview'),
      supabase
        .from('candidate_documents')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .in('status', ['pending', 'request_again']),
      supabase
        .from('recruitment_processes')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('status', 'hired')
        .gte('finished_at', monthStart.toISOString()),
      supabase
        .from('recruitment_processes')
        .select('id, candidate_id, vacancy_id, status, started_at, updated_at')
        .eq('organization_id', organizationId)
        .order('updated_at', { ascending: false })
        .limit(6),
      supabase
        .from('candidate_documents')
        .select('id, candidate_id, document_type, status, original_name, created_at')
        .eq('organization_id', organizationId)
        .in('status', ['pending', 'request_again'])
        .order('created_at', { ascending: true })
        .limit(6),
      supabase
        .from('process_history')
        .select('id, process_id, action, old_status, new_status, created_at')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(8),
    ]);

    const firstError = [
      activeResult.error,
      interviewResult.error,
      documentationResult.error,
      hiredResult.error,
      recentProcessesResult.error,
      pendingDocumentsResult.error,
      historyResult.error,
    ].find(Boolean);

    if (firstError) {
      return supabaseErrorResponse(firstError);
    }

    const recentProcesses = (recentProcessesResult.data ?? []) as unknown as Array<{
      id: string;
      candidate_id: string;
      vacancy_id: string | null;
      status: string;
      started_at: string;
      updated_at: string;
    }>;
    const pendingDocuments = (pendingDocumentsResult.data ?? []) as unknown as Array<{
      id: string;
      candidate_id: string;
      document_type: string;
      status: string;
      original_name: string | null;
      created_at: string;
    }>;
    const history = (historyResult.data ?? []) as unknown as Array<{
      id: string;
      process_id: string;
      action: string;
      old_status: string | null;
      new_status: string | null;
      created_at: string;
    }>;

    const candidateIds = [
      ...new Set([
        ...recentProcesses.map((process) => process.candidate_id),
        ...pendingDocuments.map((document) => document.candidate_id),
      ]),
    ];
    const vacancyIds = [
      ...new Set(
        recentProcesses
          .map((process) => process.vacancy_id)
          .filter((id): id is string => Boolean(id)),
      ),
    ];
    const processIds = [...new Set(history.map((item) => item.process_id))];

    const [candidateLookup, vacancyLookup, processLookup] = await Promise.all([
      candidateIds.length
        ? supabase
            .from('candidates')
            .select('id, full_name')
            .eq('organization_id', organizationId)
            .in('id', candidateIds)
        : Promise.resolve({ data: [], error: null }),
      vacancyIds.length
        ? supabase
            .from('vacancies')
            .select('id, title')
            .eq('organization_id', organizationId)
            .in('id', vacancyIds)
        : Promise.resolve({ data: [], error: null }),
      processIds.length
        ? supabase
            .from('recruitment_processes')
            .select('id, candidate_id')
            .eq('organization_id', organizationId)
            .in('id', processIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    const lookupError = [candidateLookup.error, vacancyLookup.error, processLookup.error].find(
      Boolean,
    );
    if (lookupError) {
      return supabaseErrorResponse(lookupError);
    }

    const candidates = new Map(
      ((candidateLookup.data ?? []) as unknown as Array<{ id: string; full_name: string }>).map(
        (candidate) => [candidate.id, candidate.full_name],
      ),
    );
    const vacancies = new Map(
      ((vacancyLookup.data ?? []) as unknown as Array<{ id: string; title: string }>).map(
        (vacancy) => [vacancy.id, vacancy.title],
      ),
    );
    const processes = new Map(
      ((processLookup.data ?? []) as unknown as Array<{ id: string; candidate_id: string }>).map(
        (process) => [process.id, process.candidate_id],
      ),
    );

    return json({
      data: {
        metrics: {
          activeProcesses: activeResult.count ?? 0,
          interviews: interviewResult.count ?? 0,
          pendingDocuments: documentationResult.count ?? 0,
          hiredThisMonth: hiredResult.count ?? 0,
        },
        recentProcesses: recentProcesses.map((process) => ({
          ...process,
          candidate_name: candidates.get(process.candidate_id) ?? 'Candidato não identificado',
          vacancy_title: process.vacancy_id
            ? vacancies.get(process.vacancy_id) ?? 'Vaga não identificada'
            : 'Processo sem vaga',
        })),
        pendingDocuments: pendingDocuments.map((document) => ({
          ...document,
          candidate_name: candidates.get(document.candidate_id) ?? 'Candidato não identificado',
        })),
        activity: history.map((item) => {
          const candidateId = processes.get(item.process_id);
          return {
            ...item,
            candidate_name: candidateId
              ? candidates.get(candidateId) ?? 'Candidato não identificado'
              : 'Processo não identificado',
          };
        }),
      },
    });
  } catch (error) {
    return supabaseErrorResponse(error);
  }
}
