package com.duncit.crm.telephony

import android.content.Context
import androidx.work.BackoffPolicy
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import expo.modules.interfaces.taskManager.TaskConsumerInterface
import expo.modules.interfaces.taskManager.TaskExecutionCallback
import expo.modules.interfaces.taskManager.TaskServiceProviderHelper
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.withTimeoutOrNull
import java.util.concurrent.TimeUnit

/**
 * Runs the app's call sync — the same JS task the 15-minute background sync
 * runs (services/background-sync.ts) — right after a call with a CRM contact,
 * with the app open or closed. Before this, a call reached the CRM only when
 * the app was next opened or when Android got round to the periodic task,
 * which Samsung often defers for hours.
 *
 * WorkManager waits for a network, retries with back-off and survives a
 * restart, so a call made offline is logged once the phone is back online.
 * The task is reached through Expo's task service (no compile-time link to
 * expo-background-task; its consumer class is kept by its own R8 rules).
 */
class CallSyncWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {
  override suspend fun doWork(): Result {
    val service = TaskServiceProviderHelper.getTaskServiceImpl(applicationContext) ?: return Result.retry()
    val consumers = service.getTaskConsumers(applicationContext.packageName)
      .filter { it.taskType() == BACKGROUND_TASK_TYPE }
    // Signed out, or the sync task was never registered: there is nothing to run.
    if (consumers.isEmpty()) return Result.success()
    val runs = consumers.mapNotNull { execute(it) }
    if (runs.isEmpty()) return Result.retry()
    return if (withTimeoutOrNull(TASK_TIMEOUT_MS) { runs.awaitAll() } == null) Result.retry() else Result.success()
  }

  private fun execute(consumer: TaskConsumerInterface): CompletableDeferred<Unit>? {
    val finished = CompletableDeferred<Unit>()
    return try {
      consumer.javaClass
        .getMethod("executeTask", TaskExecutionCallback::class.java)
        .invoke(consumer, TaskExecutionCallback { finished.complete(Unit) })
      finished
    } catch (_: ReflectiveOperationException) {
      null
    }
  }

  private companion object {
    const val BACKGROUND_TASK_TYPE = "expo-background-task"
    /** WorkManager stops a worker after ten minutes; give up a little before that. */
    const val TASK_TIMEOUT_MS = 9 * 60 * 1000L
  }
}

/** Schedules the call sync after a call with a CRM contact. */
internal object CallSyncScheduler {
  private const val SOON = "duncit-crm-call-sync"
  private const val LATER = "duncit-crm-recording-sync"

  /** The call log settles within seconds; the phone's recorder may take a few minutes. */
  private const val SOON_DELAY_S = 30L
  private const val LATER_DELAY_S = 5 * 60L

  fun afterCall(context: Context) {
    val work = WorkManager.getInstance(context)
    work.enqueueUniqueWork(SOON, ExistingWorkPolicy.REPLACE, request(SOON_DELAY_S))
    work.enqueueUniqueWork(LATER, ExistingWorkPolicy.REPLACE, request(LATER_DELAY_S))
  }

  /** Sign-out: nothing waits to run for an account that is gone. */
  fun cancel(context: Context) {
    val work = WorkManager.getInstance(context)
    work.cancelUniqueWork(SOON)
    work.cancelUniqueWork(LATER)
  }

  private fun request(delaySeconds: Long) = OneTimeWorkRequestBuilder<CallSyncWorker>()
    .setInitialDelay(delaySeconds, TimeUnit.SECONDS)
    .setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build())
    .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 1, TimeUnit.MINUTES)
    .build()
}
