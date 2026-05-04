"""
Outfit Follow-up Notification Service

This service sends follow-up notifications to users 24 hours after they approve
a proof card, asking them how their outfit went. This enables feedback collection
and wear tracking.
"""
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any

from app.services.supabase_client import supabase

logger = logging.getLogger(__name__)


class OutfitFollowupService:
    """Service for managing outfit follow-up notifications."""
    
    def __init__(self):
        self.notification_window_start = 23  # hours
        self.notification_window_end = 25  # hours
    
    async def get_pending_followups(self) -> List[Dict[str, Any]]:
        """
        Query outfit_logs with outcome='pending' created 23-25 hours ago.
        
        Returns:
            List of outfit logs that need follow-up notifications
        """
        try:
            now = datetime.utcnow()
            start_time = now - timedelta(hours=self.notification_window_end)
            end_time = now - timedelta(hours=self.notification_window_start)
            
            # Query outfit logs in the notification window
            result = supabase.table("outfit_logs").select(
                "id, user_id, occasion, created_at, proof_card_id"
            ).eq(
                "outcome", "pending"
            ).gte(
                "created_at", start_time.isoformat()
            ).lte(
                "created_at", end_time.isoformat()
            ).execute()
            
            logger.info(f"Found {len(result.data)} outfit logs pending follow-up")
            return result.data
            
        except Exception as e:
            logger.error(f"Error querying pending followups: {e}")
            return []
    
    async def send_followup_notification(
        self,
        user_id: str,
        outfit_log_id: str,
        occasion: str
    ) -> bool:
        """
        Send a follow-up notification to the user.
        
        Args:
            user_id: The user's ID
            outfit_log_id: The outfit log ID
            occasion: The occasion for the outfit
            
        Returns:
            True if notification was sent successfully, False otherwise
        """
        try:
            # TODO: Integrate with push notification service (Firebase, OneSignal, etc.)
            # For now, we'll create a notification record in the database
            
            notification_data = {
                "user_id": user_id,
                "type": "outfit_followup",
                "title": "How'd your outfit go?",
                "message": f"Tell us about your {occasion} outfit!",
                "action_url": f"/outfit-history/{outfit_log_id}/feedback",
                "data": {
                    "outfit_log_id": outfit_log_id,
                    "occasion": occasion
                },
                "created_at": datetime.utcnow().isoformat(),
                "read": False
            }
            
            # Store notification in database
            result = supabase.table("notifications").insert(notification_data).execute()
            
            if result.data:
                logger.info(f"Sent follow-up notification for outfit log {outfit_log_id}")
                return True
            else:
                logger.error(f"Failed to create notification for outfit log {outfit_log_id}")
                return False
                
        except Exception as e:
            logger.error(f"Error sending follow-up notification: {e}")
            return False
    
    async def process_followups(self) -> Dict[str, int]:
        """
        Process all pending follow-ups.
        
        This method should be called by a scheduled job (cron, celery, etc.)
        to send follow-up notifications to users.
        
        Returns:
            Dictionary with counts of processed and successful notifications
        """
        pending_logs = await self.get_pending_followups()
        
        processed = 0
        successful = 0
        
        for log in pending_logs:
            processed += 1
            success = await self.send_followup_notification(
                user_id=log["user_id"],
                outfit_log_id=log["id"],
                occasion=log.get("occasion", "casual")
            )
            if success:
                successful += 1
        
        logger.info(
            f"Processed {processed} follow-ups, {successful} successful"
        )
        
        return {
            "processed": processed,
            "successful": successful,
            "failed": processed - successful
        }


# Singleton instance
_followup_service = None


def get_followup_service() -> OutfitFollowupService:
    """Get the singleton outfit followup service instance."""
    global _followup_service
    if _followup_service is None:
        _followup_service = OutfitFollowupService()
    return _followup_service
