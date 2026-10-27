"use client";
import React, { useRef } from "react";
import { useScroll, useTransform, motion, MotionValue } from "framer-motion";

export const ContainerScroll = ({
  titleComponent,
  children,
}: {
  titleComponent: string | React.ReactNode;
  children: React.ReactNode;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  // Default offset: animation maps to scrolling THROUGH the element itself
  const { scrollYProgress } = useScroll({
    target: containerRef,
  });
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => {
      window.removeEventListener("resize", checkMobile);
    };
  }, []);

  const rotate = useTransform(scrollYProgress, [0, 1], [20, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [1.05, 1]);
  // Reduced translate range so heading never gets pushed off-screen
  const translate = useTransform(scrollYProgress, [0, 1], [0, -60]);

  if (isMobile) {
    // Simplified static layout for mobile — no scroll-driven 3D animation
    return (
      <div className="w-full flex flex-col items-center justify-center px-2 py-4">
        {/* Header — fully visible, no transform */}
        <div className="w-full max-w-5xl mx-auto flex flex-col items-center justify-center text-center mb-6">
          {titleComponent}
        </div>

        {/* Card — simple shadow, no perspective / rotation */}
        <div
          className="w-full max-w-2xl mx-auto rounded-[24px] border-4 border-[#6C6C6C] p-2 bg-[#222222] shadow-2xl"
          style={{
            boxShadow:
              "0 0 #0000004d, 0 9px 20px #0000004a, 0 37px 37px #00000042",
          }}
        >
          <div className="h-[22rem] w-full overflow-hidden rounded-2xl bg-gray-100">
            {children}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      // Restored original heights that kept card inside the container
      className="h-[46rem] md:h-[60rem] w-full flex items-start justify-center relative px-2 md:px-12 pt-0 pb-0"
      style={{ margin: "0 auto" }}
      ref={containerRef}
    >
      <div
        className="pt-4 pb-0 md:pt-6 md:pb-2 w-full flex flex-col items-center justify-center relative"
        style={{ perspective: "1000px" }}
      >
        <Header translate={translate} titleComponent={titleComponent} />
        <Card rotate={rotate} scale={scale}>
          {children}
        </Card>
      </div>
    </div>
  );
};

export const Header = ({ translate, titleComponent }: any) => {
  return (
    <motion.div
      style={{
        translateY: translate,
        margin: "0 auto",
      }}
      className="div w-full max-w-5xl mx-auto flex flex-col items-center justify-center text-center"
    >
      {titleComponent}
    </motion.div>
  );
};

export const Card = ({
  rotate,
  scale,
  children,
}: {
  rotate: MotionValue<number>;
  scale: MotionValue<number>;
  translate?: MotionValue<number>;
  children: React.ReactNode;
}) => {
  return (
    <motion.div
      style={{
        rotateX: rotate,
        scale,
        // Single negative margin only (removed duplicate -mt-12 class conflict)
        marginTop: "-3rem",
        marginLeft: "auto",
        marginRight: "auto",
        boxShadow:
          "0 0 #0000004d, 0 9px 20px #0000004a, 0 37px 37px #00000042, 0 84px 50px #00000026, 0 149px 60px #0000000a, 0 233px 65px #00000003",
      }}
      // Restored original card heights: h-[30rem] mobile, h-[40rem] desktop
      className="max-w-5xl mx-auto h-[30rem] md:h-[40rem] w-full border-4 border-[#6C6C6C] p-2 md:p-6 bg-[#222222] rounded-[30px] shadow-2xl"
    >
      <div className="h-full w-full overflow-hidden rounded-2xl bg-gray-100 dark:bg-zinc-900 md:rounded-2xl md:p-4">
        {children}
      </div>
    </motion.div>
  );
};
