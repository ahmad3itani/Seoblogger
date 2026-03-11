-- Grant full access to ahmed3itani@gmail.com
-- Run this in Supabase SQL Editor

-- First, find the enterprise plan ID
DO $$
DECLARE
    enterprise_plan_id TEXT;
    user_id UUID;
BEGIN
    -- Get the enterprise plan ID
    SELECT id INTO enterprise_plan_id FROM "Plan" WHERE name = 'enterprise' LIMIT 1;
    
    -- Get the user ID for ahmed3itani@gmail.com
    SELECT id INTO user_id FROM "User" WHERE email = 'ahmed3itani@gmail.com' LIMIT 1;
    
    -- Update user to enterprise plan
    IF user_id IS NOT NULL AND enterprise_plan_id IS NOT NULL THEN
        UPDATE "User" 
        SET "planId" = enterprise_plan_id,
            "role" = 'admin'
        WHERE id = user_id;
        
        -- Create or update subscription
        INSERT INTO "Subscription" (
            "id",
            "userId",
            "planId",
            "status",
            "billingCycle",
            "currentPeriodStart",
            "currentPeriodEnd",
            "cancelAtPeriodEnd"
        ) VALUES (
            gen_random_uuid()::text,
            user_id,
            enterprise_plan_id,
            'active',
            'yearly',
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP + INTERVAL '100 years',
            false
        )
        ON CONFLICT ("userId") 
        DO UPDATE SET
            "planId" = enterprise_plan_id,
            "status" = 'active',
            "currentPeriodEnd" = CURRENT_TIMESTAMP + INTERVAL '100 years',
            "cancelAtPeriodEnd" = false;
            
        RAISE NOTICE 'Successfully granted enterprise access to ahmed3itani@gmail.com';
    ELSE
        RAISE NOTICE 'User or plan not found';
    END IF;
END $$;
